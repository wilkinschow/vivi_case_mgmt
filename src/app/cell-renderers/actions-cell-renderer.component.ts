import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import type { ICellRendererAngularComp } from "ag-grid-angular";
import type { GridApi, ICellRendererParams, IRowNode } from "ag-grid-community";

@Component({
  standalone: true,
  selector: "app-actions-cell-renderer",
  imports: [CommonModule],
  template: `
    <div class="buttonCell">
      <button class="buttonStopSelling" (click)="onMarkAsDone()">
        Mark as done
      </button>
    </div>
  `,
})
export class ActionsCellRendererComponent implements ICellRendererAngularComp {
  private api?: GridApi;
  private node?: IRowNode;

  agInit(params: ICellRendererParams): void {
    this.api = params.api;
    this.node = params.node;
  }

  refresh(params: ICellRendererParams): boolean {
    this.api = params.api;
    this.node = params.node;
    return true;
  }

  onMarkAsDone() {
    console.log("Mark as done")
  }
}
