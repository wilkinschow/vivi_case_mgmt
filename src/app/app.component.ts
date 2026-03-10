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
            <div  *ngIf="isYouTubeVideo">
              <div class="video-preview">
                <iframe
                  width="507"
                  height="285"
                  [src]="videoLink"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen>
                </iframe>
                <div class="thumbnail-header">
                  <span>Images(s)</span>
                  <span style="font-weight: 400;">Total: {{ videoThumbnails.length }}</span>
                </div>
                <div class="thumbnail-reel" *ngIf="videoThumbnails.length > 0">
                  <img
                    *ngFor="let thumb of videoThumbnails"
                    [src]="thumb.url"
                    class="thumb"
                    (click)="playThumbnail(extractYouTubeVideoId(selectedRow.videoURL))"
                  />
                </div>
              </div>
            </div>
            <div class="video-preview" *ngIf="isLocalVideo">
              <video
                #localVideoPlayer
                width="507"
                height="285"
                [src]="localVideoUrl"
                controls>
                Your browser does not support video tag.
              </video>
              <div class="thumbnail-header">
                <span>Images(s)</span>
                <span style="font-weight: 400;">Total: {{ localVideoThumbnails.length }}</span>
              </div>
              <div class="thumbnail-reel" *ngIf="localVideoThumbnails.length > 0">
                <img
                  *ngFor="let thumb of localVideoThumbnails"
                  [src]="thumb.url"
                  class="thumb"
                  (click)="seekLocalVideo(thumb.timestamp)"
                />
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
                  <div class="case-label">Severity</div>
                  <span style="display: inline-block;">
                    <div
                      class="tag"
                      [ngClass]="severityLevels[selectedRow?.severity] + 'Tag'"
                      [style.padding]="'0px 12px'"
                    >
                      {{ severityLevels[selectedRow?.severity] }}
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
                    {{ selectedRow?.createdAt | date:'medium' }}
                  </div>
                </div>

                <div class="case-row">
                  <div class="case-value" [style.white-space]="'pre-wrap'">
                  <div class="case-value">
                    {{ selectedRow?.videoDesc }}
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
  videoLink: SafeResourceUrl | null = null;
  isYouTubeVideo = false;
  isLocalVideo = false;
  localVideoUrl: string | null = null;
  localVideoThumbnails: { id: string; url: string; timestamp: number }[] = [];
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
  onRowClicked(event: any) {
    this.gridApi.deselectAll();
    event.node.setSelected(true);
    this.selectedRow = event.data;
    this.showDetailPage = true;
    
    // Reset flags
    this.isYouTubeVideo = false;
    this.isLocalVideo = false;
    this.videoLink = null;
    this.localVideoUrl = null;
    
    // Check for local video first
    if (event.data.name && event.data.name.endsWith('.mp4')) {
      this.setLocalVideo(event.data.name);
    }
    // Then check for YouTube video
    else if (event.data.videoURL) {
      this.setVideoLink(event.data.videoURL);
    }
  }
  
  // Set up local video player
  setLocalVideo(filename: string) {
    this.isLocalVideo = true;
    this.localVideoUrl = `assets/video/${filename}`;
    
    // Load pre-generated thumbnails
    const baseName = filename.replace('.mp4', '');
    this.localVideoThumbnails = [
      {
        id: `${baseName}_1`,
        url: `assets/video/thumbnails/${baseName}_1.jpg`,
        timestamp: 0.25
      },
      {
        id: `${baseName}_2`,
        url: `assets/video/thumbnails/${baseName}_2.jpg`,
        timestamp: 0.50
      },
      {
        id: `${baseName}_3`,
        url: `assets/video/thumbnails/${baseName}_3.jpg`,
        timestamp: 0.75
      }
    ];
  }

  // Seek local video to specific timestamp
  seekLocalVideo(percentage: number) {
    if (this.localVideoElement?.nativeElement) {
      const video = this.localVideoElement.nativeElement;
      const timestamp = video.duration * percentage;
      video.currentTime = timestamp;
    }
  }

  // Detect YouTube video ID
  extractYouTubeVideoId(url: string): string {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : '';
  }
  videoThumbnails: { id: string; url: string }[] = [];
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
}