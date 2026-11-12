import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import { TrendingUp, ShoppingBag, DollarSign, Calendar, RefreshCw, BarChart3, Filter } from 'lucide-react';
import { Order } from '../types';

interface D3PerformanceAnalyticsProps {
  orders: Order[];
  onRefresh?: () => void;
  onSelectOrder?: (order: Order) => void;
}

type TimeRange = '7d' | '14d' | '30d' | '90d' | 'all';
type MetricMode = 'combined' | 'revenue' | 'volume';

interface DailyAggregate {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  label: string; // 'Nov 12'
  shortLabel: string;
  orderCount: number;
  totalSales: number;
  averageOrderValue: number;
  paidOrders: number;
  pendingOrders: number;
}

export const D3PerformanceAnalytics: React.FC<D3PerformanceAnalyticsProps> = ({
  orders = [],
  onRefresh,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [metricMode, setMetricMode] = useState<MetricMode>('combined');
  const [hoveredPoint, setHoveredPoint] = useState<DailyAggregate | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 1. Process orders into aggregated daily data
  const aggregatedData = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    if (safeOrders.length === 0) return [];

    // Filter by timeframe
    const now = new Date();
    let daysToInclude = 30;
    if (timeRange === '7d') daysToInclude = 7;
    else if (timeRange === '14d') daysToInclude = 14;
    else if (timeRange === '30d') daysToInclude = 30;
    else if (timeRange === '90d') daysToInclude = 90;
    else daysToInclude = 365; // 'all'

    // Build map for each day in range to avoid gaps
    const dayMap = new Map<string, DailyAggregate>();
    
    for (let i = daysToInclude - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const shortLabel = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

      dayMap.set(key, {
        date: new Date(yyyy, d.getMonth(), d.getDate()),
        dateStr: key,
        label,
        shortLabel,
        orderCount: 0,
        totalSales: 0,
        averageOrderValue: 0,
        paidOrders: 0,
        pendingOrders: 0
      });
    }

    // Populate with real orders
    orders.forEach((ord) => {
      if (!ord.createdAt) return;
      const orderDate = new Date(ord.createdAt);
      if (isNaN(orderDate.getTime())) return;

      const yyyy = orderDate.getFullYear();
      const mm = String(orderDate.getMonth() + 1).padStart(2, '0');
      const dd = String(orderDate.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;

      let agg = dayMap.get(key);
      if (!agg && timeRange === 'all') {
        const label = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        agg = {
          date: new Date(yyyy, orderDate.getMonth(), orderDate.getDate()),
          dateStr: key,
          label,
          shortLabel: label,
          orderCount: 0,
          totalSales: 0,
          averageOrderValue: 0,
          paidOrders: 0,
          pendingOrders: 0
        };
        dayMap.set(key, agg);
      }

      if (agg) {
        agg.orderCount += 1;
        agg.totalSales += Number(ord.totalAmount) || 0;
        if (ord.paymentStatus === 'Paid') {
          agg.paidOrders += 1;
        } else {
          agg.pendingOrders += 1;
        }
      }
    });

    // Compute averages and sort chronologically
    const sorted = Array.from(dayMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    sorted.forEach((item) => {
      item.averageOrderValue = item.orderCount > 0 ? Math.round(item.totalSales / item.orderCount) : 0;
    });

    return sorted;
  }, [orders, timeRange]);

  // Compute summary metrics for the active range
  const summaryMetrics = useMemo(() => {
    const totalRevenue = aggregatedData.reduce((acc, curr) => acc + curr.totalSales, 0);
    const totalOrders = aggregatedData.reduce((acc, curr) => acc + curr.orderCount, 0);
    const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const maxDailyRevenue = aggregatedData.reduce((max, curr) => Math.max(max, curr.totalSales), 0);
    const maxDailyOrders = aggregatedData.reduce((max, curr) => Math.max(max, curr.orderCount), 0);

    return { totalRevenue, totalOrders, aov, maxDailyRevenue, maxDailyOrders };
  }, [aggregatedData]);

  // 2. Render D3 Visualizations
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || aggregatedData.length === 0) return;

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove(); // Clear previous render

      const width = containerRef.current.clientWidth || 800;
    const height = 340;
    const margin = { top: 25, right: 65, bottom: 45, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    if (innerWidth <= 0 || innerHeight <= 0) return;

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Gradients & Defs
    const defs = svg.append('defs');

    // Revenue Area Gradient (Orange)
    const revenueGradient = defs
      .append('linearGradient')
      .attr('id', 'revenue-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    revenueGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#FF6000')
      .attr('stop-opacity', 0.45);

    revenueGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#FF6000')
      .attr('stop-opacity', 0.02);

    // Bar Gradient (Blue)
    const barGradient = defs
      .append('linearGradient')
      .attr('id', 'volume-bar-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    barGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#3B82F6')
      .attr('stop-opacity', 0.9);

    barGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#1D4ED8')
      .attr('stop-opacity', 0.75);

    // Scales
    const xScale = d3
      .scaleBand<string>()
      .domain(aggregatedData.map((d) => d.dateStr))
      .range([0, innerWidth])
      .padding(0.35);

    const maxSales = Math.max(d3.max(aggregatedData, (d) => d.totalSales) || 0, 10000);
    const maxOrders = Math.max(d3.max(aggregatedData, (d) => d.orderCount) || 0, 5);

    // Left Y Scale: Revenue (RWF)
    const ySalesScale = d3
      .scaleLinear()
      .domain([0, maxSales * 1.15])
      .range([innerHeight, 0])
      .nice();

    // Right Y Scale: Order Volume (Units)
    const yOrdersScale = d3
      .scaleLinear()
      .domain([0, maxOrders * 1.2])
      .range([innerHeight, 0])
      .nice();

    // Horizontal Grid Lines
    const yGrid = d3
      .axisLeft(ySalesScale)
      .ticks(5)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid text-slate-200 opacity-60')
      .call(yGrid)
      .selectAll('.tick line')
      .attr('stroke', '#E2E8F0')
      .attr('stroke-dasharray', '3 3');

    // Axes
    // X-Axis
    const tickInterval = Math.ceil(aggregatedData.length / 8);
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(
        aggregatedData
          .filter((_, idx) => idx % tickInterval === 0 || idx === aggregatedData.length - 1)
          .map((d) => d.dateStr)
      )
      .tickFormat((d) => {
        const item = aggregatedData.find((x) => x.dateStr === d);
        return item ? item.label : d;
      });

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr('color', '#64748B')
      .selectAll('text')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#64748B');

    // Left Y-Axis (Sales in RWF)
    if (metricMode !== 'volume') {
      const yAxisLeft = d3
        .axisLeft(ySalesScale)
        .ticks(5)
        .tickFormat((d) => {
          const val = Number(d);
          if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
          if (val >= 1000) return `${Math.round(val / 1000)}k`;
          return `${val}`;
        });

      const yLeftGroup = g.append('g').call(yAxisLeft).attr('color', '#FF6000');
      yLeftGroup.selectAll('text').style('font-size', '11px').style('font-weight', '700').style('fill', '#EA580C');
      yLeftGroup.select('.domain').attr('stroke', '#FDBA74');

      // Left Axis Label
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -52)
        .attr('x', -innerHeight / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '800')
        .style('fill', '#EA580C')
        .text('Daily Sales (RWF)');
    }

    // Right Y-Axis (Order Count)
    if (metricMode !== 'revenue') {
      const yAxisRight = d3
        .axisRight(yOrdersScale)
        .ticks(5)
        .tickFormat((d) => `${Math.round(Number(d))}`);

      const yRightGroup = g
        .append('g')
        .attr('transform', `translate(${innerWidth}, 0)`)
        .call(yAxisRight)
        .attr('color', '#3B82F6');

      yRightGroup.selectAll('text').style('font-size', '11px').style('font-weight', '700').style('fill', '#2563EB');
      yRightGroup.select('.domain').attr('stroke', '#93C5FD');

      // Right Axis Label
      g.append('text')
        .attr('transform', 'rotate(90)')
        .attr('y', -innerWidth - 50)
        .attr('x', innerHeight / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '800')
        .style('fill', '#2563EB')
        .text('Orders (Count)');
    }

    // 1. Draw Bars: Order Volume
    if (metricMode !== 'revenue') {
      g.selectAll('.volume-bar')
        .data(aggregatedData)
        .enter()
        .append('rect')
        .attr('class', 'volume-bar cursor-pointer transition-all duration-150')
        .attr('x', (d) => xScale(d.dateStr) || 0)
        .attr('y', innerHeight) // Start at bottom for animated intro
        .attr('width', xScale.bandwidth())
        .attr('height', 0)
        .attr('rx', Math.min(xScale.bandwidth() / 2, 4))
        .attr('fill', 'url(#volume-bar-gradient)')
        .attr('opacity', metricMode === 'combined' ? 0.7 : 0.9)
        .transition()
        .duration(650)
        .delay((_, i) => i * 15)
        .ease(d3.easeCubicOut)
        .attr('y', (d) => yOrdersScale(d.orderCount))
        .attr('height', (d) => Math.max(0, innerHeight - yOrdersScale(d.orderCount)));
    }

    // 2. Draw Area & Line: Revenue Trend
    if (metricMode !== 'volume') {
      // Area Generator
      const areaGen = d3
        .area<DailyAggregate>()
        .x((d) => (xScale(d.dateStr) || 0) + xScale.bandwidth() / 2)
        .y0(innerHeight)
        .y1((d) => ySalesScale(d.totalSales))
        .curve(d3.curveMonotoneX);

      // Line Generator
      const lineGen = d3
        .line<DailyAggregate>()
        .x((d) => (xScale(d.dateStr) || 0) + xScale.bandwidth() / 2)
        .y((d) => ySalesScale(d.totalSales))
        .curve(d3.curveMonotoneX);

      // Append Gradient Area
      g.append('path')
        .datum(aggregatedData)
        .attr('class', 'revenue-area pointer-events-none')
        .attr('fill', 'url(#revenue-area-gradient)')
        .attr('d', areaGen);

      // Append Stroke Line with drawing animation
      const path = g
        .append('path')
        .datum(aggregatedData)
        .attr('class', 'revenue-line pointer-events-none')
        .attr('fill', 'none')
        .attr('stroke', '#FF6000')
        .attr('stroke-width', 2.8)
        .attr('stroke-linecap', 'round')
        .attr('d', lineGen);

      const pathLength = path.node()?.getTotalLength() || 0;
      path
        .attr('stroke-dasharray', `${pathLength} ${pathLength}`)
        .attr('stroke-dashoffset', pathLength)
        .transition()
        .duration(850)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);

      // Circles for Data Points
      g.selectAll('.sales-dot')
        .data(aggregatedData)
        .enter()
        .append('circle')
        .attr('class', 'sales-dot')
        .attr('cx', (d) => (xScale(d.dateStr) || 0) + xScale.bandwidth() / 2)
        .attr('cy', (d) => ySalesScale(d.totalSales))
        .attr('r', 3.5)
        .attr('fill', '#FFFFFF')
        .attr('stroke', '#FF6000')
        .attr('stroke-width', 2)
        .attr('opacity', 0)
        .transition()
        .duration(600)
        .delay(500)
        .attr('opacity', 1);
    }

    // 3. Interactive Overlay: Hover Tracking across both Metrics
    const overlay = g
      .append('rect')
      .attr('class', 'overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair');

    // Vertical Focus Guide Line
    const focusLine = g
      .append('line')
      .attr('class', 'focus-line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#94A3B8')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 4')
      .style('opacity', 0)
      .style('pointer-events', 'none');

    // Highlight Circle on Revenue
    const focusCircle = g
      .append('circle')
      .attr('class', 'focus-circle')
      .attr('r', 6)
      .attr('fill', '#FF6000')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2.5)
      .style('opacity', 0)
      .style('pointer-events', 'none');

    overlay
      .on('mousemove', (event) => {
        const [mouseX, mouseY] = d3.pointer(event);

        // Find closest band point
        const eachBand = xScale.step();
        const index = Math.floor(mouseX / eachBand);
        const clampedIndex = Math.max(0, Math.min(aggregatedData.length - 1, index));
        const item = aggregatedData[clampedIndex];

        if (!item) return;

        const xPos = (xScale(item.dateStr) || 0) + xScale.bandwidth() / 2;
        const yPos = ySalesScale(item.totalSales);

        focusLine.attr('x1', xPos).attr('x2', xPos).style('opacity', 1);

        if (metricMode !== 'volume') {
          focusCircle.attr('cx', xPos).attr('cy', yPos).style('opacity', 1);
        } else {
          focusCircle.style('opacity', 0);
        }

        setHoveredPoint(item);

        // Tooltip position relative to container
        const bounds = containerRef.current?.getBoundingClientRect();
        if (bounds) {
          setTooltipPos({
            x: margin.left + xPos,
            y: Math.max(20, Math.min(mouseY + margin.top, innerHeight - 40))
          });
        }
      })
      .on('mouseleave', () => {
        focusLine.style('opacity', 0);
        focusCircle.style('opacity', 0);
        setHoveredPoint(null);
        setTooltipPos(null);
      });
    } catch (d3Err) {
      console.warn('D3 chart render notice:', d3Err);
    }
  }, [aggregatedData, metricMode]);

  // Window resize observer
  useEffect(() => {
    const handleResize = () => {
      // Trigger re-render of D3 on resize
      if (svgRef.current && containerRef.current) {
        const width = containerRef.current.clientWidth || 800;
        d3.select(svgRef.current).attr('width', width);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#FF6000]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
                  Daily Order Volume & Total Sales Trends
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/70">
                  D3.js Visualization
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Live interactive multi-axis time-series correlating daily transaction volume with gross sales (RWF).
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Metrics & Timeframe */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Selector */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setMetricMode('combined')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                metricMode === 'combined'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Combined View
            </button>
            <button
              onClick={() => setMetricMode('revenue')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                metricMode === 'revenue'
                  ? 'bg-white text-[#FF6000] shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#FF6000]" />
              Sales (RWF)
            </button>
            <button
              onClick={() => setMetricMode('volume')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                metricMode === 'volume'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              Volume
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
            {(['7d', '14d', '30d', '90d', 'all'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer uppercase ${
                  timeRange === r
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Refresh Analytics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mini Executive Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-[#FF6000]" />
            <span>Range Sales</span>
          </div>
          <div className="text-lg font-black text-slate-900 font-mono mt-1">
            {summaryMetrics.totalRevenue.toLocaleString()} <span className="text-xs text-slate-500 font-normal">RWF</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Peak Day: {summaryMetrics.maxDailyRevenue.toLocaleString()} RWF
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
            <span>Range Orders</span>
          </div>
          <div className="text-lg font-black text-slate-900 font-mono mt-1">
            {summaryMetrics.totalOrders} <span className="text-xs text-slate-500 font-normal">Orders</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Peak Day: {summaryMetrics.maxDailyOrders} orders
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Average Order Value</span>
          </div>
          <div className="text-lg font-black text-slate-900 font-mono mt-1">
            {summaryMetrics.aov.toLocaleString()} <span className="text-xs text-slate-500 font-normal">RWF</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
            Per transaction basket
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
            <span>Active Timeframe</span>
          </div>
          <div className="text-lg font-black text-slate-900 mt-1 capitalize">
            {timeRange === 'all' ? 'All Recorded' : `Past ${timeRange.replace('d', ' Days')}`}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {aggregatedData.length} active data points
          </div>
        </div>
      </div>

      {/* D3 SVG Chart Container */}
      <div ref={containerRef} className="relative w-full overflow-hidden select-none">
        <svg ref={svgRef} className="w-full overflow-visible" />

        {/* Dynamic Tooltip on Hover */}
        {hoveredPoint && tooltipPos && (
          <div
            className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-950/95 text-white rounded-xl p-3 shadow-xl border border-slate-800 text-xs backdrop-blur-md min-w-[210px]"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
              <span className="font-extrabold text-slate-200">{hoveredPoint.label}</span>
              <span className="text-[10px] text-slate-400">{hoveredPoint.dateStr}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#FF6000]" />
                  Total Sales:
                </span>
                <span className="font-mono font-bold text-orange-400">
                  {hoveredPoint.totalSales.toLocaleString()} RWF
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Order Volume:
                </span>
                <span className="font-mono font-bold text-blue-400">
                  {hoveredPoint.orderCount} {hoveredPoint.orderCount === 1 ? 'order' : 'orders'}
                </span>
              </div>

              {hoveredPoint.orderCount > 0 && (
                <>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                    <span className="text-slate-400">Average Basket:</span>
                    <span className="font-mono text-slate-300">
                      {hoveredPoint.averageOrderValue.toLocaleString()} RWF
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Paid / Pending:</span>
                    <span className="text-slate-300 font-mono">
                      {hoveredPoint.paidOrders} paid · {hoveredPoint.pendingOrders} pending
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend & Analytical Insights */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-blue-700 to-blue-500 inline-block" />
            <span className="font-semibold text-slate-700">Daily Order Volume (Bars)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-[#FF6000] inline-block relative">
              <span className="w-1.5 h-1.5 rounded-full bg-white border border-[#FF6000] absolute -top-0.5 left-1" />
            </span>
            <span className="font-semibold text-slate-700">Gross Sales Trend (Orange Curve)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span>Move cursor over graph to inspect daily figures</span>
        </div>
      </div>
    </div>
  );
};
