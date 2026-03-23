import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import type { ICellRendererAngularComp } from "ag-grid-angular";
import type { ICellRendererParams, ColDef } from "ag-grid-community";

// Custom params interface with onUpdate callback
interface StatusCellRendererParams extends ICellRendererParams {
  onUpdate: (id: string, field: string, value: any) => void;
}

@Component({
  standalone: true,
  selector: "app-status-cell-renderer",
  imports: [CommonModule],
  template: `
    <div class="tag" [ngClass]="statusClass" (click)="$event.stopPropagation()">
      <select
        class="dropdown"
        [value]="value"
        (change)="onChange($event)"
        (click)="$event.stopPropagation()"
      >
        <option hidden="true" value="Unassigned">Unassigned</option>
        <option value="Low">Low</option>
        <option value="Medium">Medium</option>
        <option value="High">High</option>
      </select>
    </div>
  `,
  styles: [`
    .dropdown {
      margin-left: auto;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--Colours-Information-Blue-Info-Blue-1, #002766) !important;
      font-size: 16px;
      font-style: normal;
      font-weight: 900;
      line-height: 24px;
    }
  `]
})
export class StatusCellRendererComponent implements ICellRendererAngularComp {
  value = "";
  valueFormatted = "";
  statusClass = "";
  params!: StatusCellRendererParams;

  // mapping between UI and backend
  labelToValueMap: Record<string, number> = {
    Unassigned: 0,
    Low: 1,
    Medium: 2,
    High: 3
  };

  valueToLabelMap: Record<number, string> = {
    0: "Unassigned",
    1: "Low",
    2: "Medium",
    3: "High"
  };

  agInit(params: ICellRendererParams): void {
    // cast to our custom interface
    this.params = params as StatusCellRendererParams;

    // backend gives number → convert to label for UI
    const rawValue = this.params.value;
    this.value = this.valueToLabelMap[rawValue] || rawValue;
    this.valueFormatted = this.params.valueFormatted ?? "";

    const displayValue = this.valueFormatted || this.value;
    this.statusClass = displayValue ? `${displayValue}Tag` : "";
  }

  onChange(event: any) {
    const label = event.target.value;
    const value = this.labelToValueMap[label];

    // get field from column definition
    const field = this.params.colDef?.field;
    if (!field) {
      console.error('Field is undefined');
      return;
    }

    if (this.params.onUpdate) {
      this.params.onUpdate(this.params.data._id, field, value);
    } else {
      console.error('onUpdate callback not provided');
    }

    // update UI immediately (optimistic)
    this.value = label;
    this.statusClass = `${label}Tag`; 
  }

  refresh(params: ICellRendererParams): boolean {
    this.agInit(params);
    return true;
  }
}