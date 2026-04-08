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

// TODO: REMOVE THUMBNAIL, clean up code
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
              <div><video
                #localVideoPlayer
                width="507"
                height="285"
                [src]="localVideoUrl"
                controls
                (timeupdate)="onVideoTimeUpdate($event)">
                Your browser does not support video tag.
              </video>
              <div class="video-watermark">
                FOR DEMO PURPOSES ONLY 
                </div>
              </div>
              
              <div class="entity-header">
                <span>Detected Person / Vehicle</span>
              </div>
              <div class="entity-reel" *ngIf="entities.length > 0">
                <div *ngFor="let entity of entities" class="entity-wrapper">
                  <img [src]="entity.url" class="entity-image" />
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
                  <div class="incident-type-wrapper">
                    <select
                      class="detail-dropdown"
                      [value]="selectedRow?.incidentType"
                      (change)="onDetailIncidentTypeChange($event)"
                    >
                      <option value="Traffic">Traffic</option>
                      <option value="Fire">Fire</option>
                      <option value="Fighting">Fighting</option>
                      <option value="Unlawful Gathering">Unlawful Gathering</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                </div>

                <div class="case-row">
                  <div class="case-label">{{ severityOrAuthenticityLabel }}</div>
                  <span style="display: inline-block;" *ngIf="activeTab === 'true'">
                    <div
                      class="tag"
                      [ngClass]="severityLevels[severityOrAuthenticityValue] + 'Tag'"
                      [style.padding]="'0px 12px'"
                    >
                      <select
                        class="detail-dropdown"
                        [value]="severityLevels[severityOrAuthenticityValue]"
                        (change)="onDetailSeverityChange($event)"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
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
                  <div class="case-value autocomplete-wrapper">
                    <div class="input-group">
                      <input
                        #locationInput
                        class="detail-input"
                        type="text"
                        [value]="selectedRow?.location || ''"
                        (input)="onLocationInput($event)"
                        (blur)="onDetailLocationChange($event)"
                        (keydown.enter)="onLocationEnter($event)"
                        placeholder="Type a location..."
                      />
                      <button
                        class="clear-btn"
                        type="button"
                        *ngIf="selectedRow?.location"
                        (mousedown)="clearLocation($event)"
                        title="Clear location"
                      >&times;</button>
                    </div>
                    <div class="autocomplete-dropdown" *ngIf="filteredCities.length > 0 && showCityDropdown">
                      <div
                        *ngFor="let city of filteredCities"
                        class="autocomplete-item"
                        (mousedown)="selectCity(city)"
                      >
                        {{ city }}
                      </div>
                    </div>
                  </div>
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
  isYouTubeVideo = false;
  videoLink: SafeResourceUrl | null = null;
  localVideoUrl: string | null = null;
  thumbnails: { id: string; url: string; timestamp: number }[] = [];
  filteredThumbnails: { id: string; url: string; timestamp: number }[] = [];
  entities: { id: string; filename: string; url: string }[] = [];
  timelineEntries: { time: number; text: string }[] = [];
  summarySegments: { text: string; isTimeline: boolean; timestamp?: number; endTime?: number }[] = [];
  currentTime: number = 0;
  @ViewChild('locationInput', { static: false }) locationInputRef!: ElementRef<HTMLInputElement>;
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
  colDefs: ColDef[] = [];

  // Column definitions for Incidents tab (Severity header)
  incidentsColDefs: ColDef[] = [];

  // Column definitions for AI-GC tab (Authenticity header)
  aiGcColDefs: ColDef[] = [];

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
    this.getData();
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
  
  async onExport() {
    if (this.showDetailPage && this.selectedRow) {
      const response = await fetch('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          data: this.selectedRow
        })
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Report-${this.selectedRow.uuid}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } 
    else
    {
         const selectedRows = this.gridApi.getSelectedRows();

      if (!selectedRows.length) {
        console.warn('No rows selected');
        return;
    }

    this.gridApi.exportDataAsCsv({
      onlySelected: true,
      fileName: 'VIVI_Report.csv',
    });}
  }
  
  selectedRowCount = 0;
  onSelectionChanged() {
    this.selectedRowCount = this.gridApi.getSelectedRows().length;
  }
  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}
  onGridReady(params: any) {
    this.gridApi = params.api;
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

  updateField = (id: string, field: string, value: any) => {
    this.http.patch(`http://localhost:3000/videos/${id}`, { field, value }).subscribe({
      next: () => {
        console.log('Updated');
        const rowNode = this.gridApi.getRowNode(id);
        if (rowNode) rowNode.setDataValue(field, value);
        this.getData();
      },
      error: (err) => console.error(err)
    });
  };

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

  // Handle severity change from detail page dropdown
  onDetailSeverityChange(event: any) {
    const label = event.target.value;
    const labelToValueMap: Record<string, number> = {
      Low: 1,
      Medium: 2,
      High: 3
    };
    const value = labelToValueMap[label];

    if (this.selectedRow?._id) {
      // Update UI optimistically
      this.selectedRow.severity = value;
      // Call the same updateField method used by the data grid
      this.updateField(this.selectedRow._id, 'severity', value);
    }
  }

  // Handle incident type change from detail page dropdown
  onDetailIncidentTypeChange(event: any) {
    const value = event.target.value;

    if (this.selectedRow?._id) {
      // Update UI optimistically
      this.selectedRow.incidentType = value;
      // Call the same updateField method used by the data grid
      this.updateField(this.selectedRow._id, 'incidentType', value);
    }
  }

  // Autocomplete state
  filteredCities: string[] = [];
  showCityDropdown = false;

  // Handle input typing - filter cities by prefix match
  onLocationInput(event: any) {
    const value = event.target.value.trim();
    if (value.length > 0) {
      const prefix = value.toLowerCase();
      this.filteredCities = this.citySuggestions.filter(city =>
        city.toLowerCase().startsWith(prefix)
      );
      this.showCityDropdown = this.filteredCities.length > 0;
    } else {
      this.filteredCities = [];
      this.showCityDropdown = false;
    }
  }

  // Clear location input
  clearLocation(event: any) {
    event.preventDefault();
    if (this.locationInputRef?.nativeElement) {
      this.locationInputRef.nativeElement.value = '';
    }
    this.filteredCities = [];
    this.showCityDropdown = false;

    if (this.selectedRow?._id) {
      this.selectedRow.location = '';
      this.updateField(this.selectedRow._id, 'location', '');
    }
  }

  // Handle city selection from dropdown
  selectCity(city: string) {
    this.showCityDropdown = false;
    this.filteredCities = [];

    // Update the input element's visible value
    if (this.locationInputRef?.nativeElement) {
      this.locationInputRef.nativeElement.value = city;
    }

    if (this.selectedRow?._id) {
      this.selectedRow.location = city;
      this.updateField(this.selectedRow._id, 'location', city);
    }
  }

  // Handle Enter key on location input - blur the input to trigger save
  onLocationEnter(event: any) {
    this.showCityDropdown = false;
    const target = event.target as HTMLElement;
    if (target) {
      target.blur();
    }
  }

  // Handle location change from detail page input (on blur)
  onDetailLocationChange(event: any) {
    this.showCityDropdown = false;
    const value = event.target.value.trim();

    if (this.selectedRow?._id && value !== this.selectedRow?.location) {
      // Update UI optimistically
      this.selectedRow.location = value;
      // Call the same updateField method used by the data grid
      this.updateField(this.selectedRow._id, 'location', value);
    }
  }

  // Singapore locations for autocomplete
  citySuggestions: string[] = [
    "Admiralty", "Ang Mo Kio", "Balestier", "Bayshore", "Bedok",
    "Bedok Reservoir", "Bishan", "Boat Quay", "Boon Lay", "Boulevard",
    "Bugis", "Buangkok", "Bukit Batok", "Bukit Merah", "Bukit Panjang",
    "Bukit Timah", "Central Water Catchment", "Changi", "Changi Bay",
    "Chinatown", "Choa Chu Kang", "City Hall", "Clarke Quay", "Clementi",
    "Compassvale", "Dhoby Ghaut", "East Coast", "Farrer Park", "Fernvale",
    "Geylang", "Holland Village", "Hougang", "Hougang Central", "Joo Chiat",
    "Jurong East", "Jurong Industrial Estate", "Jurong Island", "Jurong West",
    "Kallang", "Katong", "Kembangan", "Lakeside", "Lim Chu Kang",
    "Little India", "Lorong Halus", "MacPherson", "Mandai", "Marina Bay",
    "Marina East", "Marina South", "Marine Parade", "Mountbatten", "Nanyang",
    "Newton", "Novena", "Orchard", "Outram", "Pasir Ris", "Paya Lebar",
    "Pioneer", "Pulau Ubin", "Punggol", "Queenstown", "Raffles Place",
    "Rivervale", "River Valley", "Rochor", "Seletar", "Sembawang",
    "Sengkang", "Sentosa", "Serangoon", "Siglap", "Simei", "Simpang",
    "Singapore River", "Springleaf", "Sungei Kadut", "Tampines", "Tanglin",
    "Tanah Merah", "Teban Gardens", "Telok Blangah", "Tengah",
    "Tiong Bahru", "Toa Payoh", "Toh Guan", "Tuas", "West Coast",
    "Western Islands", "Woodlands", "Yishun", "Yuhua"
  ];

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
    this.isYouTubeVideo = false;
    this.localVideoUrl = null;
    this.videoLink = null;
    
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
    this.fetchEntities(media_uuid);
  }

  // Fetch entities from backend_vlm
  fetchEntities(media_uuid: string) {
    this.http.get<any>(`/api/entities/${media_uuid}`)
      .subscribe({
        next: (data) => {
          console.log('Fetched entities:', data);
          this.entities = data.entities || [];
        },
        error: (err) => {
          console.error('Error fetching entities:', err);
          this.entities = [];
        }
      });
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

  // YouTube-related methods (kept for backward compatibility)
  videoThumbnails: { id: string; url: string }[] = [];
  
  extractYouTubeVideoId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  // Create sanitized embed URL
  setVideoLink(url: string) {
    const videoId = this.extractYouTubeVideoId(url);
    if (!videoId) return;
    this.isYouTubeVideo = true;

    // Set the main player
    this.videoLink = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${videoId}`
    );

    // For now, just 3 thumbnails as a sample
    const thumbUrls = [
      `https://img.youtube.com/vi/${videoId}/1.jpg`,
      `https://img.youtube.com/vi/${videoId}/2.jpg`,
      `https://img.youtube.com/vi/${videoId}/3.jpg`,
    ];

    this.videoThumbnails = thumbUrls.map((url, idx) => ({ id: `${videoId}_${idx}`, url }));
  }

  // When user clicks a thumbnail
  playThumbnail(videoId: string) {
    this.videoLink = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${videoId}`
    );
  }

  ngOnInit() {
    // Severity column uses the updateField callback
    this.colDefs = [
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
        filterParams: { valueFormatter: severityFormatter },
        headerClass: "header-status",
        headerName: "Severity",
        cellRendererParams: {
          onUpdate: this.updateField.bind(this) // ✅ safe now
        }
      },
      { field: "location", minWidth: 150 },
      { field: "submissionDate", headerName: "Date & Time of Report", minWidth: 200 },
      { field: "summary", minWidth: 700, headerName: "Incident Summary" },
      { field: "isValidVideo", hide: true }
    ];

    // If you have tab-specific columns, do the same in ngOnInit
    this.incidentsColDefs = [
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
        filterParams: { valueFormatter: severityFormatter },
        headerClass: "header-status",
        headerName: "Severity",
        cellRendererParams: {
          onUpdate: this.updateField.bind(this) // ✅ safe now
        }
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
    this.aiGcColDefs = [
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
        // cellRenderer: "statusCellRenderer",
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
  }
}