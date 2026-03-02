import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";
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

ModuleRegistry.registerModules([
  AllCommunityModule,
]);

const paginationPageSizeSelector = [5, 10, 20];
const tabs = {
  "true": "Incidents",
  "false": "AI-GC",
};
const severityLevels = {
  "0": "All",
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
};

@Component({
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
        <div class="exampleHeader">
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
        <div class="grid" [ngClass]="themeClass">
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
          >
          </ag-grid-angular>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
})

export class AppComponent {
  themeClass = "ag-theme-quartz-dark";
  statusEntries = Object.entries(tabs);
  activeTab = "true";
  gridOptions = gridOptions;
  colDefs: ColDef[] = [
    {
      field: "uuid",
      headerName: "Case ID",
    },
    { 
      field: "incidentType",
      headerName: "Incident Type",
    },
    {
      field: "severity",
      valueFormatter: severityFormatter,
      cellRenderer: "statusCellRenderer",
      minWidth: 193,
      filterParams: {
        valueFormatter: severityFormatter,
      },
      headerClass: "header-status",
    },
    { 
      field: "location",
    },
    { 
      field: "submissionDate",
      headerName: "Date & Time of Report",
    },
    { 
      field: "summary",
      minWidth: 322,
      headerName: "Incident Summary",
    },
    { field: "action", 
      cellRenderer: "actionsCellRenderer", 
      minWidth: 193,
      filter: false, 
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
    resizable: false, 
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
  onExport() {
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
  constructor(private http: HttpClient) {}
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
}