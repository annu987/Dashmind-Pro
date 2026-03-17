/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, ScatterChart, Scatter, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  AreaChart, Area
} from "recharts";
import { 
  Send, Bot, User, Loader2, BarChart3, PieChart as PieChartIcon, 
  LineChart as LineChartIcon, ScatterChart as ScatterIcon, Info, 
  Upload, FileText, CheckCircle2, DollarSign, Hash, Calendar, 
  Tag, Activity, AlertCircle, TrendingUp, History, XCircle 
} from "lucide-react";
import Papa from "papaparse";
import { Message, DashboardPlan, Filter, ColumnSchema } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Utility Functions ---

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Enhanced Local Heuristic Engine ---

/**
 * Advanced Heuristic Engine supporting Multi-Chart, Filters, and Smart Logic
 */
const analyzeQuery = (query: string, schema: ColumnSchema[]): DashboardPlan => {
  const lowerQuery = query.toLowerCase();
  
  // 1. Schema Categorization
  const numericCols = schema.filter(c => ['integer', 'float'].includes(c.type));
  const dateCols = schema.filter(c => c.type === 'date' || c.name.toLowerCase().includes('year'));
  const catCols = schema.filter(c => c.type === 'string');

  // --- 6. Error Handling: No Numeric Data ---
  if (numericCols.length === 0) {
    return { 
      status: "CANNOT_ANSWER", 
      dashboard_title: "Data Error", 
      plan: { charts: [], kpis: [], insight_required: false },
      error: "NO_NUMERIC_COLUMNS" 
    };
  }

  // 2. Primary Metric Selection (Y-axis)
  let yCol = numericCols[0].name;
  const foundNum = numericCols.find(c => lowerQuery.includes(c.name.toLowerCase()));
  if (foundNum) yCol = foundNum.name;

  // 3. Primary Dimension Selection (X-axis)
  let xCol = catCols.length > 0 ? catCols[0].name : (dateCols.length > 0 ? dateCols[0].name : schema[0].name);
  const foundCat = [...catCols, ...dateCols].find(c => lowerQuery.includes(c.name.toLowerCase()));
  if (foundCat) xCol = foundCat.name;

  // --- 2. Natural Filter Parsing Logic ---
  const filters: Filter[] = [];
  
  // Numeric/Date filters: "after 2020", "above 5000"
  const numberMatch = lowerQuery.match(/(?:after|above|greater than|over)\s+(\d+)/);
  if (numberMatch) {
    const val = numberMatch[1];
    // Try to find a date/year column first, then a numeric column
    const targetCol = dateCols.length > 0 ? dateCols[0].name : numericCols[0].name;
    filters.push({ column: targetCol, operator: ">", value: Number(val) });
  }

  const numberBelowMatch = lowerQuery.match(/(?:before|below|less than|under)\s+(\d+)/);
  if (numberBelowMatch) {
    const val = numberBelowMatch[1];
    const targetCol = dateCols.length > 0 ? dateCols[0].name : numericCols[0].name;
    filters.push({ column: targetCol, operator: "<", value: Number(val) });
  }

  // String filters: "petrol", "electric", "automatic"
  // Simple heuristic: check if query contains a unique value from a string column
  catCols.forEach(col => {
    // In a real app we'd scan unique values, here we check common demo words if column name matches context
    if (col.name.toLowerCase().includes('fuel') || col.name.toLowerCase().includes('type')) {
      if (lowerQuery.includes('petrol')) filters.push({ column: col.name, operator: "=", value: "Petrol" });
      if (lowerQuery.includes('diesel')) filters.push({ column: col.name, operator: "=", value: "Diesel" });
      if (lowerQuery.includes('electric')) filters.push({ column: col.name, operator: "=", value: "Electric" });
    }
    if (col.name.toLowerCase().includes('transmission')) {
      if (lowerQuery.includes('automatic')) filters.push({ column: col.name, operator: "=", value: "Automatic" });
      if (lowerQuery.includes('manual')) filters.push({ column: col.name, operator: "=", value: "Manual" });
    }
  });

  // 4. Chart Type Logic
  let chartType = 'bar';
  if (lowerQuery.includes('line') || lowerQuery.includes('trend') || lowerQuery.includes('over time')) chartType = 'line';
  if (lowerQuery.includes('pie') || lowerQuery.includes('share') || lowerQuery.includes('distribution')) chartType = 'pie';
  if (lowerQuery.includes('scatter') || lowerQuery.includes('correlation')) chartType = 'scatter';
  if (lowerQuery.includes('rank') || lowerQuery.includes('top')) chartType = 'horizontal_bar';
  
  // 4. New: Suggestion Improvements
  if (lowerQuery.includes('compare')) chartType = 'bar';
  if (lowerQuery.includes('forecast')) chartType = 'line';

  // 5. Aggregation Logic
  let aggregation = 'sum';
  if (lowerQuery.includes('average') || lowerQuery.includes('mean')) aggregation = 'average';
  if (lowerQuery.includes('count')) aggregation = 'count';
  if (lowerQuery.includes('max') || lowerQuery.includes('highest')) aggregation = 'max';
  if (lowerQuery.includes('min') || lowerQuery.includes('lowest')) aggregation = 'min';

  // --- 1. Multi-Chart Plan Support ---
  let charts: any[] = [];

  if (lowerQuery.includes('dashboard') || lowerQuery.includes('overview')) {
    // Generate a rich 3-chart dashboard
    charts = [
      // 1. Trend Line (Time based)
      {
        type: "line",
        x: dateCols.length > 0 ? dateCols[0].name : xCol,
        y: yCol,
        aggregation: "average",
        group_by: dateCols.length > 0 ? dateCols[0].name : xCol,
        filters: [...filters], // Apply same filters to overview
        sort: "",
        limit: ""
      },
      // 2. Composition Pie (Category)
      {
        type: "pie",
        x: catCols.length > 0 ? catCols[0].name : xCol,
        y: yCol,
        aggregation: "sum",
        group_by: catCols.length > 0 ? catCols[0].name : xCol,
        filters: [...filters],
        sort: "",
        limit: ""
      },
      // 3. Ranking Bar (Top 5)
      {
        type: "horizontal_bar",
        x: xCol,
        y: yCol,
        aggregation: "max",
        group_by: xCol,
        filters: [...filters],
        sort: `${yCol}_desc`,
        limit: "5"
      }
    ];
  } else {
    // Standard Single Chart Request
    charts = [{
      type: chartType,
      x: xCol,
      y: yCol,
      aggregation: aggregation,
      group_by: xCol,
      filters: filters,
      sort: lowerQuery.includes('top') ? `${yCol}_desc` : (lowerQuery.includes('bottom') ? `${yCol}_asc` : ''),
      limit: lowerQuery.includes('top') || lowerQuery.includes('bottom') ? (parseInt(lowerQuery.match(/\d+/)?.[0] || '5')) : ''
    }];
  }

  // --- 3. KPI Smart Generation ---
  const kpis = [
    { metric: yCol, aggregation: 'sum', filters: [...filters] },
    { metric: yCol, aggregation: 'average', filters: [...filters] },
    { metric: yCol, aggregation: 'max', filters: [...filters] },
    { metric: yCol, aggregation: 'min', filters: [...filters] },
    // Growth KPI marker (Calculated later)
    { metric: yCol, aggregation: 'growth', filters: [...filters] } 
  ];

  return {
    status: "SUCCESS",
    dashboard_title: charts.length > 1 ? "Executive Overview" : `${aggregation} ${yCol} by ${xCol}`,
    plan: {
      charts,
      kpis,
      insight_required: true
    }
  };
};

/**
 * Enhanced Insight Engine with Growth Detection
 */
const generateLocalInsight = (plan: DashboardPlan, data: any[], schema: ColumnSchema[]): string => {
  if (data.length === 0) return "Insufficient data for analysis.";
  
  const chart = plan.plan.charts[0]; // Analyze primary chart
  const yKey = chart.y;
  const xKey = chart.x || chart.group_by;
  
  const sorted = [...data].sort((a, b) => Number(a[xKey]) - Number(b[xKey])); // Sort by X (assuming time/ordinal)
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const firstVal = Number(first[yKey]);
  const lastVal = Number(last[yKey]);

  let insights = [];

  // --- 5. Insight Engine Upgrade: Growth Detection ---
  if (firstVal !== 0) {
    const change = lastVal - firstVal;
    const percentChange = ((change / firstVal) * 100).toFixed(1);
    const trend = change >= 0 ? "increased" : "decreased";
    
    insights.push(`**Trend Analysis:** The metric ${yKey} has ${trend} by ${Math.abs(percentChange)}% from ${first[xKey]} to ${last[xKey]}.`);
  }

  // Top Performer
  const topPerformer = [...data].sort((a,b) => Number(b[yKey]) - Number(a[yKey]))[0];
  insights.push(`**Peak Performance:** The highest value was recorded by ${topPerformer[xKey]} at ${topPerformer[yKey].toLocaleString()}.`);

  // Data Variance (Simple)
  const avg = data.reduce((a, b) => a + Number(b[yKey]), 0) / data.length;
  insights.push(`**Average Stability:** The mean performance is ${avg.toLocaleString(undefined, {maximumFractionDigits:0})}, indicating ${Math.abs(lastVal - avg) > avg * 0.2 ? 'high volatility' : 'stable performance'} in recent periods.`);

  return insights.join('\n\n');
};


// --- Main App Component ---

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "System Online. Upload a CSV to initialize the heuristic engine." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [schema, setSchema] = useState<ColumnSchema[]>([]);
  const [currentPlan, setCurrentPlan] = useState<DashboardPlan | null>(null);
  const [currentInsight, setCurrentInsight] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // --- 8. Query History Panel ---
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const detectSchema = (data: any[]): ColumnSchema[] => {
    if (data.length === 0) return [];
    const firstRow = data[0];
    return Object.keys(firstRow).map(key => {
      const val = firstRow[key];
      let type: ColumnSchema["type"] = "string";
      if (typeof val === "number") {
        type = Number.isInteger(val) ? "integer" : "float";
      } else if (typeof val === "boolean") {
        type = "boolean";
      } else if (!isNaN(Date.parse(val)) && isNaN(Number(val))) {
        type = "date";
      } else if (!isNaN(Number(val)) && val !== "") {
        type = Number.isInteger(Number(val)) ? "integer" : "float";
      }
      return { name: key, type };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        const detectedSchema = detectSchema(data);
        setCsvData(data);
        setSchema(detectedSchema);
        setIsLoading(false);
        setCurrentPlan(null);
        setCurrentInsight(null);
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: `Data Ingestion Complete. "${file.name}" loaded. ${data.length} records detected. Schema mapped successfully. Ready for queries.` 
        }]);
      },
      error: (err) => {
        console.error("CSV Parse Error:", err);
        setIsLoading(false);
        setMessages(prev => [...prev, { role: "assistant", content: "Parse Failure: Invalid CSV format detected." }]);
      }
    });
  };

  const applyFilters = (data: any[], filters: Filter[]): any[] => {
    let filtered = [...data];
    filters.forEach((f: Filter) => {
      const col = f.column;
      const val = f.value;
      
      switch (f.operator) {
        case "=":
          filtered = filtered.filter(d => String(d[col]).toLowerCase() === String(val).toLowerCase());
          break;
        case ">":
          filtered = filtered.filter(d => Number(d[col]) > Number(val));
          break;
        case "<":
          filtered = filtered.filter(d => Number(d[col]) < Number(val));
          break;
        case ">=":
          filtered = filtered.filter(d => Number(d[col]) >= Number(val));
          break;
        case "<=":
          filtered = filtered.filter(d => Number(d[col]) <= Number(val));
          break;
        case "in":
          const vals = Array.isArray(val) ? val.map(v => String(v).toLowerCase()) : [String(val).toLowerCase()];
          filtered = filtered.filter(d => vals.includes(String(d[col]).toLowerCase()));
          break;
        case "between":
          if (Array.isArray(val) && val.length === 2) {
            filtered = filtered.filter(d => Number(d[col]) >= Number(val[0]) && Number(d[col]) <= Number(val[1]));
          }
          break;
      }
    });
    return filtered;
  };

  // --- 3. KPI Calculation with Growth Support ---
  const calculateKPI = (kpi: any, data: any[]): number | string => {
    const filtered = applyFilters(data, kpi.filters);
    const values = filtered.map(d => Number(d[kpi.metric]));
    
    if (values.length === 0) return 0;

    // Handle Growth KPI specifically
    if (kpi.aggregation === 'growth') {
      // Need to find a time column or sort by index
      // For simplicity in this demo, we compare first vs last item
      if (values.length < 2) return "0%";
      const first = values[0];
      const last = values[values.length - 1];
      if (first === 0) return "N/A";
      const growth = ((last - first) / first) * 100;
      return `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
    }

    switch (kpi.aggregation) {
      case "average":
      case "mean":
        return values.reduce((a, b) => a + b, 0) / values.length;
      case "sum":
        return values.reduce((a, b) => a + b, 0);
      case "count":
        return values.length;
      case "max":
        return Math.max(...values);
      case "min":
        return Math.min(...values);
      default:
        return 0;
    }
  };

  const processChartData = (chart: any): any[] => {
    let filtered = applyFilters(csvData, chart.filters);

    if (chart.group_by) {
      const groups: Record<string, number[]> = {};
      filtered.forEach(d => {
        const key = String(d[chart.group_by]);
        if (!groups[key]) groups[key] = [];
        groups[key].push(Number(d[chart.y]));
      });

      let result = Object.entries(groups).map(([key, values]) => {
        let aggValue = 0;
        switch (chart.aggregation) {
          case "average":
          case "mean":
            aggValue = values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case "sum":
            aggValue = values.reduce((a, b) => a + b, 0);
            break;
          case "count":
            aggValue = values.length;
            break;
          case "max":
            aggValue = Math.max(...values);
            break;
          case "min":
            aggValue = Math.min(...values);
            break;
          default:
            aggValue = values.length;
        }
        return {
          [chart.x]: key,
          [chart.y]: Number(aggValue.toFixed(2))
        };
      });

      if (chart.sort) {
        const [field, order] = chart.sort.split("_");
        result.sort((a, b) => {
          const valA = Number(a[chart.y]);
          const valB = Number(b[chart.y]);
          return order === "desc" ? valB - valA : valA - valB;
        });
      }

      if (chart.limit) {
        result = result.slice(0, Number(chart.limit));
      }

      return result;
    }

    if (chart.type === "scatter") {
      return filtered.map(d => ({
        x: d[chart.x],
        y: d[chart.y],
        label: d[schema[0]?.name] || "Point"
      }));
    }

    return filtered;
  };

  const getKpiIcon = (metric: string, aggregation: string) => {
    if (aggregation === 'growth') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    const m = metric.toLowerCase();
    if (m.includes('price') || m.includes('cost') || m.includes('revenue')) return <DollarSign className="w-4 h-4" />;
    if (m.includes('count') || m.includes('total')) return <Hash className="w-4 h-4" />;
    if (m.includes('year') || m.includes('date')) return <Calendar className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const [errorState, setErrorState] = useState<string | null>(null);

  const loadSampleData = () => {
    const sample = [
      { model: "Tesla Model 3", year: 2020, price: 45000, fuel_type: "Electric", transmission: "Automatic" },
      { model: "Tesla Model 3", year: 2021, price: 48000, fuel_type: "Electric", transmission: "Automatic" },
      { model: "Tesla Model 3", year: 2022, price: 52000, fuel_type: "Electric", transmission: "Automatic" },
      { model: "BMW 3 Series", year: 2020, price: 41000, fuel_type: "Petrol", transmission: "Automatic" },
      { model: "BMW 3 Series", year: 2021, price: 43000, fuel_type: "Petrol", transmission: "Automatic" },
      { model: "BMW 3 Series", year: 2022, price: 46000, fuel_type: "Petrol", transmission: "Automatic" },
      { model: "Audi A4", year: 2020, price: 39000, fuel_type: "Diesel", transmission: "Automatic" },
      { model: "Audi A4", year: 2021, price: 41000, fuel_type: "Diesel", transmission: "Automatic" },
      { model: "Audi A4", year: 2022, price: 44000, fuel_type: "Diesel", transmission: "Automatic" },
      { model: "Ford Mustang", year: 2020, price: 55000, fuel_type: "Petrol", transmission: "Manual" },
      { model: "Ford Mustang", year: 2021, price: 58000, fuel_type: "Petrol", transmission: "Manual" },
      { model: "Ford Mustang", year: 2022, price: 62000, fuel_type: "Petrol", transmission: "Manual" },
    ];
    setCsvData(sample);
    setFileName("car_market_sample.csv");
    setSchema([
      { name: "model", type: "string" },
      { name: "year", type: "integer" },
      { name: "price", type: "integer" },
      { name: "fuel_type", type: "string" },
      { name: "transmission", type: "string" },
    ]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || csvData.length === 0) return;

    const userMessage = input;
    
    // --- 8. Add to History ---
    setQueryHistory(prev => [userMessage, ...prev].slice(0, 10)); // Keep last 10
    
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    setErrorState(null);

    try {
      // Simulate processing delay for "Skeleton" feel
      await new Promise(r => setTimeout(r, 1200));

      const plan: DashboardPlan = analyzeQuery(userMessage, schema);
      
      if (plan.status === "SUCCESS") {
        setCurrentPlan(plan);
        
        let insight = "";
        if (plan.plan.insight_required) {
          const chartData = processChartData(plan.plan.charts[0]);
          insight = generateLocalInsight(plan, chartData, schema);
          setCurrentInsight(insight);
        }

        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: `Analysis complete. Visualizing: "${plan.dashboard_title}"`,
          plan,
          insight
        }]);
      } else {
        // --- 6. Error Handling UI State ---
        let errorMsg = "I could not process that request.";
        if (plan.error === "NO_NUMERIC_COLUMNS") {
          errorMsg = "Analysis Failed: Dataset contains no numeric columns to calculate metrics.";
        } else {
          errorMsg = "Heuristic Failure: Query parameters do not match available data columns.";
        }
        
        setErrorState(errorMsg);
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: errorMsg 
        }]);
      }
    } catch (error) {
      console.error("Processing Error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "System Error: An unexpected exception occurred during analysis." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const renderChart = (chart: any) => {
    const data = processChartData(chart);

    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-white/20">
          <XCircle className="w-8 h-8 mb-2 opacity-20" />
          <p className="text-xs font-mono uppercase tracking-widest">No Data Found</p>
          <p className="text-[10px] mt-1 opacity-40">Try adjusting filters</p>
        </div>
      );
    }

    const commonTooltipStyle = {
      backgroundColor: '#111827',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#F9FAFB',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    };

    // --- 7. Animation: Recharts handles basic animation, we ensure wrapper is stable ---
    switch (chart.type) {
      case "bar":
      case "horizontal_bar":
        const layout = chart.type === "horizontal_bar" ? "vertical" : "horizontal";
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout={layout} margin={{ left: layout === "vertical" ? 60 : 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              {layout === "horizontal" ? (
                <>
                  <XAxis dataKey={chart.x} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }} />
                </>
              ) : (
                <>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }} />
                  <YAxis type="category" dataKey={chart.x} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }} width={100} />
                </>
              )}
              <Tooltip contentStyle={commonTooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey={chart.y} fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey={chart.x} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }} />
              <Tooltip contentStyle={commonTooltipStyle} />
              <Line type="monotone" dataKey={chart.y} stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#111827', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              <Area type="monotone" dataKey={chart.y} stroke="none" fill="#3B82F6" fillOpacity={0.1} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey={chart.y}
                nameKey={chart.x}
                stroke="none"
                label={(entry) => entry.name} // Simple label
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={commonTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return <div className="text-white/20 text-xs">Unsupported Visualization Type</div>;
    }
  };

  // --- 7. Loading Skeleton Component ---
  const ChatSkeleton = () => (
    <div className="flex flex-col gap-1.5 animate-pulse">
      <div className="h-4 w-20 bg-white/10 rounded"></div>
      <div className="p-4 glass-card rounded-2xl rounded-tl-none space-y-2">
        <div className="h-2 bg-white/10 rounded w-3/4"></div>
        <div className="h-2 bg-white/10 rounded w-1/2"></div>
        <div className="h-2 bg-white/10 rounded w-5/6"></div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background font-sans text-text overflow-hidden">
      {/* Sidebar - Chat */}
      <div className="w-[400px] flex flex-col glass border-r border-white/10 z-20">
        <div className="p-6 border-b border-white/10 bg-slate-900/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent text-white rounded-lg shadow-lg shadow-accent/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm uppercase tracking-[0.2em] text-white">DashMind Pro</h1>
              <p className="text-[10px] font-mono text-accent opacity-80">HEURISTIC_ENGINE_V2</p>
            </div>
          </div>
          {fileName && (
            <div className="flex items-center gap-1 text-[9px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-1 border border-emerald-500/20 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              <span>ONLINE</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
          {messages.map((m, i) => (
            <div key={i} className={cn(
              "flex flex-col gap-1.5",
              m.role === "user" ? "items-end" : "items-start"
            )}>
              <span className="text-[9px] font-mono uppercase opacity-40 px-1 tracking-widest">
                {m.role === "user" ? "USER" : "SYSTEM"}
              </span>
              <div className={cn(
                "p-4 text-xs leading-relaxed max-w-[90%] transition-all",
                m.role === "user" 
                  ? "bg-accent text-white rounded-2xl rounded-tr-none shadow-lg shadow-accent/10" 
                  : "glass-card text-text rounded-2xl rounded-tl-none"
              )}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && <ChatSkeleton />}
          <div ref={messagesEndRef} />
        </div>

        {/* --- 8. Query History Panel --- */}
        {queryHistory.length > 0 && (
          <div className="px-4 py-2 border-t border-white/5 bg-black/20">
             <div className="flex items-center gap-2 mb-2">
                <History className="w-3 h-3 text-white/30" />
                <p className="text-[9px] font-mono uppercase text-white/30 tracking-wider">Recent Queries</p>
             </div>
             <div className="flex flex-wrap gap-2 overflow-y-auto max-h-24 scrollbar-hide">
               {queryHistory.map((q, i) => (
                 <button 
                   key={i}
                   onClick={() => setInput(q)}
                   className="text-[9px] bg-white/5 hover:bg-white/10 text-white/60 hover:text-white px-2 py-1 rounded transition-colors truncate max-w-[150px]"
                 >
                   {q}
                 </button>
               ))}
             </div>
          </div>
        )}

        <div className="p-6 border-t border-white/10 space-y-4 bg-card/30">
          {csvData.length > 0 && !currentPlan && (
            <div className="space-y-3 mb-2">
              <p className="text-[9px] font-mono uppercase text-accent/60 tracking-widest px-1">Try Asking:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Dashboard overview",
                  "Price trend over years",
                  "Top 5 expensive models",
                  "Show only petrol cars",
                  "Average price by fuel type"
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="text-[10px] font-mono px-3 py-1.5 glass rounded-lg border-white/5 hover:border-accent/30 hover:bg-accent/5 transition-all text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 glass-card text-[10px] font-mono uppercase tracking-widest hover:bg-white/5 transition-all active:scale-95 rounded-xl"
            >
              <Upload className="w-3 h-3 text-accent" />
              {fileName ? "Change Data" : "Upload CSV"}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".csv" 
              className="hidden" 
            />
          </div>

          <div className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={csvData.length === 0}
              placeholder={csvData.length === 0 ? "Waiting for data..." : "Ask anything... (e.g. 'Show petrol cars after 2020')"}
              className="w-full pl-4 pr-12 py-3 bg-background/50 border border-white/10 text-xs font-mono focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all disabled:opacity-50 rounded-xl placeholder:text-white/20"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim() || csvData.length === 0}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-accent hover:bg-accent/10 disabled:opacity-30 transition-all rounded-lg"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Dashboard */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-accent/5 blur-[100px] rounded-full pointer-events-none" />

        <header className="h-16 glass border-b border-white/10 flex items-center justify-between px-10 shrink-0 z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse"></div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent">Live Analysis</span>
            </div>
            <h2 className="font-bold text-sm uppercase tracking-[0.3em] text-white/90">
              {currentPlan?.dashboard_title || "System Standby"}
            </h2>
          </div>
          <div className="flex items-center gap-8 text-[10px] font-mono">
            <div className="flex items-center gap-3 px-4 py-1.5 glass rounded-full">
              <div className={cn("w-1.5 h-1.5 rounded-full", csvData.length > 0 ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-white/20")} />
              <span className="opacity-60">{csvData.length > 0 ? "ACTIVE" : "IDLE"}</span>
            </div>
            <div className="opacity-40 tracking-widest">
              ROWS: <span className="text-white opacity-100">{csvData.length.toLocaleString()}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-10 overflow-y-auto z-0 scrollbar-hide">
          {csvData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
              <div className="w-24 h-24 glass-card rounded-3xl flex items-center justify-center mb-10 relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <FileText className="w-10 h-10 text-accent relative z-10" />
              </div>
              <h3 className="text-3xl font-bold uppercase tracking-[0.4em] mb-6 text-white">Initialize Core</h3>
              <p className="text-sm font-mono opacity-40 mb-12 leading-relaxed max-w-sm">
                DashMind Pro requires a CSV source to begin multi-dimensional heuristic analysis.
              </p>
              <button 
                onClick={loadSampleData}
                className="px-10 py-4 glass text-white text-[11px] font-mono uppercase tracking-[0.3em] hover:bg-white/5 hover:text-accent transition-all rounded-2xl border border-white/10 hover:border-accent/50"
              >
                Load Sample Dataset
              </button>
            </div>
          ) : errorState ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto">
               {/* --- 6. Error Handling UI --- */}
              <div className="w-20 h-20 glass-card rounded-3xl flex items-center justify-center mb-10 relative">
                <div className="absolute inset-0 bg-red-500/10 blur-2xl rounded-full" />
                <AlertCircle className="w-8 h-8 text-red-400 relative z-10" />
              </div>
              <h3 className="text-2xl font-bold uppercase tracking-[0.3em] mb-6 text-white">Analysis Failed</h3>
              <p className="text-sm font-mono opacity-60 mb-12 leading-relaxed bg-white/5 p-6 rounded-xl border border-red-500/20 text-red-200">
                {errorState}
              </p>
              <button 
                onClick={() => setErrorState(null)}
                className="px-8 py-3 glass text-white text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-white/5 transition-all rounded-xl"
              >
                Dismiss Error
              </button>
            </div>
          ) : currentPlan ? (
            <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
              
              {/* --- 3. Smart KPI Grid --- */}
              <div className="grid grid-cols-5 gap-4">
                {currentPlan.plan.kpis.map((kpi, i) => (
                  <div key={i} className="glass-card p-5 rounded-2xl relative overflow-hidden group hover:border-accent/30 transition-all">
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-all" />
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-mono uppercase text-accent tracking-widest opacity-70">
                        {kpi.aggregation.toUpperCase()}
                      </p>
                      <div className="p-1.5 glass rounded-md text-accent/50 group-hover:text-accent transition-colors">
                        {getKpiIcon(kpi.metric, kpi.aggregation)}
                      </div>
                    </div>
                    <p className="text-2xl font-bold font-mono tracking-tight text-white">
                      {calculateKPI(kpi, csvData)}
                    </p>
                    <p className="text-[9px] text-white/30 mt-1 truncate">{kpi.metric}</p>
                  </div>
                ))}
              </div>

              {/* --- 1. Multi-Chart Grid --- */}
              <div className={cn(
                "grid gap-6 transition-all duration-500",
                currentPlan.plan.charts.length > 1 ? "grid-cols-2" : "grid-cols-1"
              )}>
                {currentPlan.plan.charts.map((chart, i) => (
                  <div key={i} className={cn(
                    "glass-card p-6 rounded-2xl flex flex-col hover:border-accent/20 transition-all",
                    currentPlan.plan.charts.length === 1 && "h-[500px]"
                  )} style={{ minHeight: '350px' }}>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">
                          {chart.aggregation} {chart.y}
                        </h3>
                        <p className="text-[9px] font-mono text-white/30 mt-1 tracking-widest uppercase">
                          BY {chart.group_by || chart.x} • {chart.type.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {chart.filters.map((f, fi) => (
                          <span key={fi} className="text-[8px] font-mono px-2 py-1 bg-accent/10 text-accent border border-accent/20 rounded flex items-center gap-1">
                             {f.column} {f.operator} {f.value}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 w-full">
                      {renderChart(chart)}
                    </div>
                  </div>
                ))}
              </div>

              {/* --- 5. Insight Engine Upgrade --- */}
              {currentInsight && (
                <div className="glass-card p-8 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-8 h-px bg-accent/30" />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent">AI-Generated Insights</h3>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 max-w-4xl">
                    <div className="prose prose-invert prose-sm font-mono text-white/70 leading-relaxed">
                      {currentInsight.split('\n\n').map((block, i) => (
                        <p key={i} className="mb-2 last:mb-0">
                           {block.split('\n').map((line, j) => (
                             <span key={j} className="block pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-accent before:mr-2">
                               {line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')}
                             </span>
                           ))}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-3xl mx-auto">
              <div className="w-20 h-20 glass-card rounded-[2rem] flex items-center justify-center mb-10 relative group">
                <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse" />
                <BarChart3 className="w-8 h-8 text-accent relative z-10" />
              </div>
              <h3 className="text-3xl font-bold uppercase tracking-[0.5em] mb-6 text-white">Ready</h3>
              <p className="text-sm font-mono opacity-40 mb-16 leading-relaxed max-w-md">
                Dataset linked. Neural pathways initialized. <br/>
                <span className="text-accent">Type a query</span> to begin analysis.
              </p>
              
              <div className="w-full max-w-2xl">
                <div className="glass-card p-8 rounded-3xl">
                  <p className="text-[10px] font-mono uppercase text-accent tracking-[0.2em] mb-6">Available Columns</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {schema.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 glass rounded-xl border-white/5">
                        <span className="text-[10px] font-mono text-white/80">{c.name}</span>
                        <span className="text-[8px] font-mono text-accent opacity-40">[{c.type}]</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}