// ---------- CHART TYPES ----------

export type ChartType =
  | "line"
  | "bar"
  | "pie"
  | "scatter"
  | "histogram"
  | "horizontal_bar";


// ---------- AGGREGATION TYPES ----------

export type AggregationType =
  | "average"
  | "sum"
  | "count"
  | "max"
  | "min"
  | "mean"
  | "growth"
  | "forecast";


// ---------- FILTER OPERATORS ----------

export type OperatorType =
  | "="
  | ">"
  | "<"
  | ">="
  | "<="
  | "between"
  | "in";


// ---------- SORT TYPES ----------

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  field: string;
  direction: SortDirection;
}


// ---------- FILTER MODEL ----------

export interface Filter {
  column: string;
  operator: OperatorType;
  value: any;
}


// ---------- PREDICTION CONFIG (Future ML Feature) ----------

export interface PredictionConfig {
  enabled: boolean;
  periods?: number; // number of future steps
}


// ---------- CHART PLAN ----------

export interface ChartPlan {
  id?: string;
  title?: string;
  type: ChartType;

  x: string;
  y: string;

  // Optional secondary metric (compare charts)
  y_secondary?: string;

  aggregation: AggregationType;
  group_by?: string;

  filters: Filter[];

  sort?: SortConfig;
  limit?: number;

  prediction?: PredictionConfig;
}


// ---------- KPI PLAN ----------

export interface KPIPlan {
  label?: string;
  metric: string;
  aggregation: AggregationType;
  filters: Filter[];
}


// ---------- INSIGHT MODEL ----------

export interface Insight {
  type: "trend" | "anomaly" | "summary";
  message: string;
}


// ---------- DASHBOARD PLAN ----------

export interface DashboardPlan {
  status: "SUCCESS" | "CANNOT_ANSWER";
  dashboard_title: string;

  plan: {
    charts: ChartPlan[];
    kpis: KPIPlan[];
    insight_required: boolean;
    insights?: Insight[];
  };
}


// ---------- CHAT MESSAGE ----------

export interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;

  plan?: DashboardPlan;
  insight?: string;

  timestamp?: number;
}


// ---------- CSV SCHEMA ----------

export interface ColumnSchema {
  name: string;
  type: "string" | "number" | "integer" | "float" | "boolean" | "date";
}