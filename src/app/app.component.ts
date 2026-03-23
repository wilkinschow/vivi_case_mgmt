import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, ViewChild, ElementRef } from "@angular/core";
import { AgGridAngular } from "ag-grid-angular";
import type {
  ColDef,
  GridApi,
  GridOptions,
  SizeColumnsToFitGridStrategy,
  ValueFormatterFunc,
} from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { ActionsCellRendererComponent } from "./cell-renderers/actions-cell-renderer.component";
import { StatusCellRendererComponent } from "./cell-renderers/status-cell-renderer.component";
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

ModuleRegistry.registerModules([
  AllCommunityModule,
]);

const paginationPageSizeSelector = [5, 10, 20];
const tabs = {
  "true": "Incidents",
  "false": "AI-GC",
};
const severityLevels = {
  "0": "Unassigned",
  "1": "Low",
  "2": "Medium",
  "3": "High",
};
const severityFormatter: ValueFormatterFunc = ({ value }) =>
  severityLevels[value as keyof typeof severityLevels] ?? "";

// Format authenticity value (0-1) as percentage
const authenticityFormatter: ValueFormatterFunc = ({ value }) => {
  if (value === null || value === undefined) return "";
  const percentage = (value * 100).toFixed(0);
  return `${percentage}%`;
};

const gridOptions: GridOptions = {
  rowSelection: {
    mode: 'multiRow',
  },
  columnMenu: 'new',
  suppressRowClickSelection: true,
  getRowId: params => params.data.uuid,
};

@Component({
  styleUrls: ['./app.component.css'],
  standalone: true,
  selector: "app-root",
  imports: [CommonModule, AgGridAngular],
  template: `
    <div class="wrapper">
      <div  class="header">
        <div class="top-container">
          <img src="assets/logo.png" alt="V.I.V.I" class="top-icon" />
        </div>
      </div>
      <div class="container">
        <div *ngIf="!showDetailPage" class="exampleHeader">
          <div class="tabs">
            <button
              *ngFor="let entry of statusEntries"
              class="tabButton"
              [class.active]="activeTab === entry[0]"
              (click)="handleTabClick(entry[0])"
            >
              {{ entry[1] }}

              <span
                *ngIf="activeTab === entry[0]"
                class="tabBadge"
              >
                {{ getTabCount(entry[0]) }}
              </span>
            </button>
          </div>
          <button
            class="exportButton"
            [disabled]="selectedRowCount === 0"
            (click)="onExport()"
          >
            <i class="fa-thin fa-file-export exportIcon"></i>
            <span class="exportText">Export Report</span>
          </button>
        </div>
        <div [class.hidden]="showDetailPage" class="grid" [ngClass]="themeClass">
          <ag-grid-angular
            class="grid-root"
            [columnDefs]="colDefs"
            [rowData]="rowData"
            [rowHeight]="66"
            [defaultColDef]="defaultColDef"
            [autoSizeStrategy]="autoSizeStrategy"
            [pagination]="true"
            [paginationPageSize]="10"
            [paginationPageSizeSelector]="paginationPageSizeSelector"
            [detailRowAutoHeight]="true"
            [components]="components"
            (gridReady)="onGridReady($event)" 
            [gridOptions]="gridOptions"
            (selectionChanged)="onSelectionChanged()"
            (rowClicked)="onRowClicked($event)"
          >
          </ag-grid-angular>
        </div>

        <!-- DETAIL PAGE -->
        <div *ngIf="showDetailPage" class="detailPage">
          <div class="exampleHeader">
            <div class="breadcrumb">
              <span 
                class="breadcrumb-link"
                (click)="backToTable()"
                alt="Back to Table"
              >
                Incident Case
              </span>
              <i class="fa-solid fa-chevron-right"></i>
              <span>
                {{ selectedRow?.uuid }}
              </span>
            </div>
            <button
              class="exportButton"
              (click)="onExport()"
            >
              <i class="fa-thin fa-file-export exportIcon"></i>
              <span class="exportText">Export Report</span>
            </button>
          </div>
          <div class="details-body">
            <div class="video-preview" *ngIf="isLocalVideo">
              <video
                #localVideoPlayer
                width="507"
                height="285"
                [src]="localVideoUrl"
                controls
                (timeupdate)="onVideoTimeUpdate($event)">
                Your browser does not support video tag.
              </video>
              <div class="thumbnail-header">
                <span>Images(s)</span>
              </div>
              <div class="thumbnail-reel" *ngIf="filteredThumbnails.length > 0">
                <div
                  *ngFor="let thumb of filteredThumbnails"
                  class="thumbnail-wrapper"
                  (click)="seekLocalVideo(thumb.timestamp)"
                >
                  <img [src]="thumb.url" class="thumb" />
                  <div class="thumbnail-timestamp">{{ formatTimestamp(thumb.timestamp) }}</div>
                </div>
              </div>
            </div>
            <div class="case-details">
              <div class="case-title">
                Case Report Details
              </div>

              <div class="case-content">

                <div class="case-row">
                  <div class="case-label">Case ID</div>
                  <div class="case-value">{{ selectedRow?.uuid }}</div>
                </div>

                <div class="case-row">
                  <div class="case-label">Incident Type</div>
                  <div class="case-value">{{ selectedRow?.incidentType }}</div>
                </div>

                <div class="case-row">
                  <div class="case-label">{{ severityOrAuthenticityLabel }}</div>
                  <span style="display: inline-block;" *ngIf="activeTab === 'true'">
                    <div
                      class="tag"
                      [ngClass]="severityLevels[severityOrAuthenticityValue] + 'Tag'"
                      [style.padding]="'0px 12px'"
                    >
                      {{ severityLevels[severityOrAuthenticityValue] }}
                    </div>
                  </span>
                  <span style="display: inline-block;" *ngIf="activeTab === 'false'">
                    <div
                      class="tag authenticity-tag"
                      [style.padding]="'0px 12px'"
                    >
                      {{ formattedAuthenticityValue }}
                    </div>
                  </span>
                </div>

                <div class="case-row">
                  <div class="case-label">Location</div>
                  <div class="case-value">{{ selectedRow?.location }}</div>
                </div>

                <div class="case-row">
                  <div class="case-label">Date & Time of Report</div>
                  <div class="case-value">
                    {{ selectedRow?.createdAt | date:'d MMMM y, h:mm:ss a' }}
                  </div>
                </div>

                <div class="case-row">
                  <div class="case-value summary-text" [style.white-space]="'pre-wrap'">
                    <div *ngFor="let segment of summarySegments">
                      <span 
                        *ngIf="!segment.isTimeline"
                        class="summary-line"
                      >
                        {{ segment.text }}
                      </span>
                      <div
                        *ngIf="segment.isTimeline"
                        class="timeline-line"
                        [class.active]="isSegmentActive(segment)"
                        (click)="seekLocalVideo(segment.timestamp!)"
                      >
                        {{ segment.text }}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
})

export class AppComponent {
  isLocalVideo = false;
  localVideoUrl: string | null = null;
  thumbnails: { id: string; url: string; timestamp: number }[] = [];
  filteredThumbnails: { id: string; url: string; timestamp: number }[] = [];
  timelineEntries: { time: number; text: string }[] = [];
  summarySegments: { text: string; isTimeline: boolean; timestamp?: number; endTime?: number }[] = [];
  currentTime: number = 0;
  @ViewChild('localVideoPlayer', { static: false }) localVideoElement!: ElementRef<HTMLVideoElement>;
  severityLevels: Record<number, string> = {
    0: "Unassigned",
    1: "Low",
    2: "Medium",
    3: "High",
  };
  themeClass = "ag-theme-quartz-dark";
  statusEntries = Object.entries(tabs);
  activeTab = "true";
  gridOptions = gridOptions;
  colDefs: ColDef[] = [
    {
      field: "uuid",
      minWidth: 200,      
      headerName: "Case ID",
      sort: 'desc', // Default ascending sort
      
    },
    { 
      field: "incidentType",
      minWidth: 150,
      headerName: "Incident Type",
    },
    {
      field: "severity",
      valueFormatter: severityFormatter,
      cellRenderer: "statusCellRenderer",
      minWidth: 150,
      filterParams: {
        valueFormatter: severityFormatter,
      },
      headerClass: "header-status",
    },
    { 
      field: "location",
      minWidth: 150,      
    },
    { 
      field: "submissionDate",
      headerName: "Date & Time of Report",
      minWidth: 200,
    },
    { 
      field: "summary",
      minWidth: 700,
      headerName: "Incident Summary",
    },
    // { field: "action", 
    //   cellRenderer: "actionsCellRenderer", 
    //   minWidth: 193,
    //   filter: false, 
    // },
    { 
      field: "isValidVideo",
      headerName: "Valid Video",
      cellDataType: 'string',
      hide: true,
    },
  ];

  // Column definitions for Incidents tab (Severity header)
  incidentsColDefs: ColDef[] = [
    {
      field: "uuid",
      minWidth: 200,
      headerName: "Case ID",
      sort: 'desc',
    },
    { 
      field: "incidentType",
      minWidth: 150,
      headerName: "Incident Type",
    },
    {
      field: "severity",
      valueFormatter: severityFormatter,
      cellRenderer: "statusCellRenderer",
      minWidth: 150,
      filterParams: {
        valueFormatter: severityFormatter,
      },
      headerClass: "header-status",
      headerName: "Severity",
    },
    { 
      field: "location",
      minWidth: 150,      
    },
    { 
      field: "submissionDate",
      headerName: "Date & Time of Report",
      minWidth: 200,
    },
    { 
      field: "summary",
      minWidth: 700,
      headerName: "Incident Summary",
    },
    { 
      field: "isValidVideo",
      headerName: "Valid Video",
      cellDataType: 'string',
      hide: true,
    },
  ];

  // Column definitions for AI-GC tab (Authenticity header)
  aiGcColDefs: ColDef[] = [
    {
      field: "uuid",
      minWidth: 200,
      headerName: "Case ID",
      sort: 'desc',
    },
    { 
      field: "incidentType",
      minWidth: 150,
      headerName: "Incident Type",
    },
    {
      field: "authenticity",
      valueFormatter: authenticityFormatter,
      cellRenderer: "statusCellRenderer",
      minWidth: 150,
      filterParams: {
        valueFormatter: authenticityFormatter,
      },
      headerClass: "header-status",
      headerName: "Authenticity",
    },
    { 
      field: "location",
      minWidth: 150,      
    },
    { 
      field: "submissionDate",
      headerName: "Date & Time of Report",
      minWidth: 200,
    },
    { 
      field: "summary",
      minWidth: 700,
      headerName: "Incident Summary",
    },
    { 
      field: "isValidVideo",
      headerName: "Valid Video",
      cellDataType: 'string',
      hide: true,
    },
  ];

  rowData: any[] = [];
  defaultColDef: ColDef = { 
    minWidth: 259,
    resizable: true,
    suppressHeaderMenuButton: false, 
    filter: true,
    floatingFilter: true,
  };
  autoSizeStrategy: SizeColumnsToFitGridStrategy = { type: "fitGridWidth" };
  paginationPageSizeSelector = paginationPageSizeSelector;

  components = {
    actionsCellRenderer: ActionsCellRendererComponent,
    statusCellRenderer: StatusCellRendererComponent,
  };
  private gridApi!: GridApi;
  incidentCount : number = 0;
  aiGcCount: number = 0;

  handleTabClick(selectedTab: string) {
    this.gridApi.deselectAll();
    this.activeTab = selectedTab;
    
    // Switch column definitions based on the selected tab
    if (selectedTab === 'true') {
      this.gridApi.setGridOption('columnDefs', this.incidentsColDefs);
    } else {
      this.gridApi.setGridOption('columnDefs', this.aiGcColDefs);
    }
    
    this.gridApi.setFilterModel({
      isValidVideo: {
        filterType: 'text',
        type: 'equals',
        filter: selectedTab,
      },
    });
  }
  backToTable() {
    this.gridApi.deselectAll();
    this.showDetailPage = false;
  }
  onExport() {
    // DETAIL PAGE EXPORT
    if (this.showDetailPage && this.selectedRow) {

      this.gridApi.exportDataAsCsv({
        fileName: 'export-report.csv',
        onlySelected: false,
        shouldRowBeSkipped: (params) => {
          return params.node.data !== this.selectedRow;
        }
      });

      return;
    }

    // TABLE EXPORT
    const selectedRows = this.gridApi.getSelectedRows();

    if (!selectedRows.length) {
      console.warn('No rows selected');
      return;
    }

    this.gridApi.exportDataAsCsv({
      onlySelected: true,
      fileName: 'export-report.csv',
    });
  }
  selectedRowCount = 0;
  onSelectionChanged() {
    this.selectedRowCount = this.gridApi.getSelectedRows().length;
  }
  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}
  onGridReady(params: any) {
    this.gridApi = params.api;
    this.getData();
    this.handleTabClick(this.activeTab);
  }

  getTabCount(tabKey: string): number {
    if (tabKey === 'true') return this.incidentCount;
    if (tabKey === 'false') return this.aiGcCount;
    return 0;
  }

  getData() {
    this.http.get<any[]>('http://localhost:3000/fetchData')
    .subscribe({
      next: (data) => {
        this.incidentCount = data.filter(r => r.isValidVideo === true).length;
        this.aiGcCount = data.filter(r => r.isValidVideo === false).length;
        this.gridApi.setGridOption('rowData', data);
      },
      error: (err) => {
        console.error('Error fetching data:', err);
      }
    });
  }

  showDetailPage = false;
  selectedRow: any = null;

  // Get the appropriate label (Severity or Authenticity) based on the active tab
  get severityOrAuthenticityLabel(): string {
    return this.activeTab === 'true' ? 'Severity' : 'Authenticity';
  }

  // Get the appropriate value (severity or authenticity) based on the active tab
  get severityOrAuthenticityValue(): number {
    if (this.activeTab === 'true') {
      return this.selectedRow?.severity;
    } else {
      return this.selectedRow?.authenticity;
    }
  }

  // Format authenticity value as percentage for detail page display
  get formattedAuthenticityValue(): string {
    const value = this.selectedRow?.authenticity;
    if (value === null || value === undefined) return "";
    const percentage = (value * 100).toFixed(0);
    return `${percentage}%`;
  }

  onRowClicked(event: any) {
    this.gridApi.deselectAll();
    event.node.setSelected(true);
    this.selectedRow = event.data;
    console.log(event.data);
    this.showDetailPage = true;
    
    // Update activeTab based on row type to ensure correct label/value display
    if (event.data.isValidVideo === true) {
      this.activeTab = 'true'; // Incidents
    } else {
      this.activeTab = 'false'; // AI-GC
    }
    
    // Reset flags
    this.isLocalVideo = false;
    this.localVideoUrl = null;
    
    // All videos (YouTube or file upload) use backend_vlm
    if (event.data.media_uuid) {
      this.setBackendVideo(event.data.media_uuid);
    }
  }
  
  // Parse videoDesc into clickable and non-clickable segments
  parseSummarySegments(summary: string): { text: string; isTimeline: boolean; timestamp?: number; endTime?: number }[] {
    if (!summary) return [];
    
    const segments: { text: string; isTimeline: boolean; timestamp?: number; endTime?: number }[] = [];
    
    // Split summary into lines
    const lines = summary.split('\n');
    
    // Timeline regex formats:
    // Format 1: "MM:SS - MM:SS: description" (e.g., "00:00 - 00:05: A blue car...")
    // Format 2: "MM:SS: description" (e.g., "00:00: A blue car...")
    // Supports 1-2 digits for minutes (0-99)
    const timelineRegex = /^(\d{1,2}):(\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?:\s*(.+)$/;
    
    for (const line of lines) {
      const match = line.match(timelineRegex);
      if (match) {
        // This is a timeline line - make it clickable
        const startMinutes = parseInt(match[1], 10);
        const startSeconds = parseInt(match[2], 10);
        
        const startTime = startMinutes * 60 + startSeconds;
        
        segments.push({
          text: line,
          isTimeline: true,
          timestamp: startTime,
          endTime: match[3] ? (parseInt(match[3], 10) * 60 + parseInt(match[4], 10)) : undefined
        });
      } else {
        // This is a regular text line
        segments.push({
          text: line,
          isTimeline: false
        });
      }
    }
    
    console.log('Parsed summary segments:', segments);
    return segments;
  }

  // Set up video player using backend_vlm
  setBackendVideo(media_uuid: string) {
    this.isLocalVideo = true;
    this.localVideoUrl = `/api/video/${media_uuid}`;
    
    // Parse summary for clickable timeline
    const summary = this.selectedRow?.videoDesc || this.selectedRow?.summary || '';
    this.summarySegments = this.parseSummarySegments(summary);
    
    this.fetchThumbnails(media_uuid);
  }

  // Parse timeline from summary to extract significant event timestamps
  // NOTE: Only the START time is used for thumbnail filtering
  // The end time is only used for timeline display and active state highlighting
  parseTimelineFromSummary(summary: string): { time: number; text: string }[] {
    if (!summary) return [];
    
    const entries: { time: number; text: string }[] = [];
    
    // Split summary into lines
    const lines = summary.split('\n');
    
    // Find lines matching timeline formats:
    // Format 1: "MM:SS - MM:SS: description" (e.g., "00:00 - 00:05: A blue car...")
    // Format 2: "MM:SS: description" (e.g., "00:00: A blue car...")
    // Supports 1-2 digits for minutes (0-99)
    // Only captures START time for thumbnail filtering
    const timelineRegex = /^(\d{1,2}):(\d{2})(?:\s*-\s*\d{1,2}:\d{2})?:\s*(.+)$/;
    
    for (const line of lines) {
      const match = line.match(timelineRegex);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const totalSeconds = minutes * 60 + seconds;
        const text = match[3].trim();
        
        // Only store the START time for thumbnail filtering
        // Example: "0:15 - 0:20: Grey car turns left" → only shows thumbnail at 15s
        entries.push({
          time: totalSeconds,  // This is only the START time
          text: line
        });
      }
    }
    
    console.log('Parsed timeline entries (start times only for thumbnails):', entries);
    return entries;
  }
  
  // Fetch thumbnails from backend_vlm
  fetchThumbnails(media_uuid: string) {
    this.http.get<any>(`/api/thumbnails/${media_uuid}`)
      .subscribe({
        next: (data) => {
          console.log('Fetched thumbnails:', data);
          this.thumbnails = data.thumbnails || [];
          
          // Parse timeline from summary
          const summary = this.selectedRow?.videoDesc || this.selectedRow?.summary || '';
          this.timelineEntries = this.parseTimelineFromSummary(summary);
          
          // Filter thumbnails to show only significant events
          this.filterThumbnailsByTimeline();
        },
        error: (err) => {
          console.error('Error fetching thumbnails:', err);
          this.thumbnails = [];
          this.filteredThumbnails = [];
          this.timelineEntries = [];
        }
      });
  }
  
  // Filter thumbnails to show only those matching timeline timestamps
  filterThumbnailsByTimeline() {
    if (this.timelineEntries.length === 0) {
      // If no timeline entries, show all thumbnails
      this.filteredThumbnails = [...this.thumbnails];
      console.log('No timeline entries, showing all thumbnails');
      return;
    }
    
    // Get unique timestamps from timeline (round to nearest integer)
    const timelineTimestamps = this.timelineEntries.map(entry => Math.round(entry.time));
    console.log('=== Thumbnail Filtering ===');
    console.log('Timeline timestamps (from events):', timelineTimestamps);
    console.log('All thumbnail timestamps:', this.thumbnails.map(t => Math.round(t.timestamp)));
    
    // Filter thumbnails to match timeline timestamps
    this.filteredThumbnails = this.thumbnails.filter(thumb => {
      const thumbTime = Math.round(thumb.timestamp);
      
      // Find which timeline entry this thumbnail matches (if any)
      // Use tighter tolerance: ±0.5 seconds instead of ±1 second
      // This prevents end-time thumbnails from matching start times incorrectly
      const matchedTime = timelineTimestamps.find(t => Math.abs(t - thumbTime) <= 0.5);
      
      if (matchedTime !== undefined) {
        console.log(`✓ Thumbnail at ${thumbTime}s → Matched timeline entry at ${matchedTime}s`);
      }
      
      return matchedTime !== undefined;
    });
    
    console.log('Filtered thumbnails:', this.filteredThumbnails.length, 'out of', this.thumbnails.length);
    console.log('======================');
  }

  // Check if a timeline segment is currently active
  isSegmentActive(segment: { text: string; isTimeline: boolean; timestamp?: number; endTime?: number }): boolean {
    if (!segment.isTimeline || segment.timestamp === undefined) {
      return false;
    }
    
    const tolerance = 0.5;
    
    // If segment has both start and end time, check if current time is within range
    if (segment.endTime !== undefined) {
      return this.currentTime >= (segment.timestamp - tolerance) && 
             this.currentTime <= (segment.endTime + tolerance);
    }
    
    // If segment only has start time (single timestamp), show active when close to that time
    // Active from timestamp-2 to timestamp+3 seconds
    const windowStart = segment.timestamp - 2;
    const windowEnd = segment.timestamp + 3;
    return this.currentTime >= windowStart && this.currentTime <= windowEnd;
  }

  // Track video playback time
  onVideoTimeUpdate(event: Event) {
    const video = event.target as HTMLVideoElement;
    this.currentTime = video.currentTime;
  }

  // Seek video to specific timestamp (in seconds)
  seekLocalVideo(timestamp: number) {
    if (this.localVideoElement?.nativeElement) {
      const video = this.localVideoElement.nativeElement;
      video.currentTime = timestamp;
      video.play().catch(e => console.log('Autoplay prevented:', e));
    }
  }

  // Format timestamp as MM:SS
  formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
