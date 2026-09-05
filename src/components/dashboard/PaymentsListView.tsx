import React, { useState, useMemo } from 'react';
import { PaymentRecord, FailureReason, PaymentMethod, CanonicalAction, PriorityLevel, PaymentStatus } from '../../types';
import {
  formatINR,
  formatFailureReason,
  formatPaymentMethod,
  formatActionShortLabel,
  formatRelativeTime,
  formatPercent,
} from '../../utils/formatters';
import { PriorityBadge, StatusBadge } from '../common/Badge';
import { ProbabilityBadge } from '../common/ProbabilityBadge';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  X,
  CreditCard,
  Smartphone,
  Building,
  Wallet,
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface PaymentsListViewProps {
  payments: PaymentRecord[];
  onSelectPayment: (payment: PaymentRecord) => void;
  onNavigateToPayment?: (paymentId: string) => void;
}

type SortField =
  | 'id'
  | 'customer'
  | 'amount'
  | 'paymentMethod'
  | 'failureReason'
  | 'recoveryProbability'
  | 'expectedRecoveryValue'
  | 'recommendedAction'
  | 'priority'
  | 'status'
  | 'failedAt';

type SortDirection = 'asc' | 'desc';

export const PaymentsListView: React.FC<PaymentsListViewProps> = ({
  payments,
  onSelectPayment,
  onNavigateToPayment,
}) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states
  const [filterReason, setFilterReason] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterProbability, setFilterProbability] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAmountRange, setFilterAmountRange] = useState<string>('all');
  const [customMinAmount, setCustomMinAmount] = useState<string>('');
  const [customMaxAmount, setCustomMaxAmount] = useState<string>('');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState<boolean>(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('amount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Priority weighting for sorting
  const priorityWeight: Record<PriorityLevel, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  // Status weighting for sorting
  const statusWeight: Record<PaymentStatus, number> = {
    at_risk: 5,
    recovering: 4,
    recovered: 3,
    failed: 2,
    abandoned: 1,
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterReason('all');
    setFilterMethod('all');
    setFilterProbability('all');
    setFilterAction('all');
    setFilterPriority('all');
    setFilterStatus('all');
    setFilterAmountRange('all');
    setCustomMinAmount('');
    setCustomMaxAmount('');
    setCurrentPage(1);
  };

  // Quick Preset Handlers
  const handlePreset = (preset: 'high_value' | 'critical' | 'high_prob' | 'upi' | 'expired_card') => {
    handleResetFilters();
    switch (preset) {
      case 'high_value':
        setFilterAmountRange('gt_100k');
        break;
      case 'critical':
        setFilterPriority('critical');
        break;
      case 'high_prob':
        setFilterProbability('high_gt_75');
        break;
      case 'upi':
        setFilterMethod('upi');
        break;
      case 'expired_card':
        setFilterReason('card_expired');
        break;
    }
  };

  // Sorting Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Default to descending for monetary amounts / probabilities, ascending for text
      if (['amount', 'expectedRecoveryValue', 'recoveryProbability', 'failedAt'].includes(field)) {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
    setCurrentPage(1);
  };

  // Filter application
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesCustomer = item.customer.customerName.toLowerCase().includes(q);
        const matchesEmail = item.customer.email.toLowerCase().includes(q);
        const matchesCode = item.failureCode.toLowerCase().includes(q);
        const matchesDetails = item.paymentMethodDetails.toLowerCase().includes(q);
        if (!matchesId && !matchesCustomer && !matchesEmail && !matchesCode && !matchesDetails) {
          return false;
        }
      }

      // 2. Failure Reason
      if (filterReason !== 'all' && item.failureReason !== filterReason) {
        return false;
      }

      // 3. Payment Method
      if (filterMethod !== 'all' && item.paymentMethod !== filterMethod) {
        return false;
      }

      // 4. Recovery Probability Range
      if (filterProbability !== 'all') {
        if (filterProbability === 'very_high_gt_85' && item.recoveryProbability < 0.85) return false;
        if (filterProbability === 'high_gt_75' && item.recoveryProbability < 0.75) return false;
        if (filterProbability === 'mid_40_75' && (item.recoveryProbability < 0.40 || item.recoveryProbability >= 0.75)) return false;
        if (filterProbability === 'low_lt_40' && item.recoveryProbability >= 0.40) return false;
      }

      // 5. Recommended Action
      if (filterAction !== 'all' && item.recommendedAction !== filterAction) {
        return false;
      }

      // 6. Priority
      if (filterPriority !== 'all' && item.priority !== filterPriority) {
        return false;
      }

      // 7. Status
      if (filterStatus !== 'all' && item.status !== filterStatus) {
        return false;
      }

      // 8. Amount Filter Range
      if (filterAmountRange !== 'all') {
        if (filterAmountRange === 'gt_100k' && item.amount < 100000) return false;
        if (filterAmountRange === '50k_100k' && (item.amount < 50000 || item.amount >= 100000)) return false;
        if (filterAmountRange === '20k_50k' && (item.amount < 20000 || item.amount >= 50000)) return false;
        if (filterAmountRange === 'lt_20k' && item.amount >= 20000) return false;
        if (filterAmountRange === 'custom') {
          const min = customMinAmount ? parseFloat(customMinAmount) : 0;
          const max = customMaxAmount ? parseFloat(customMaxAmount) : Infinity;
          if (item.amount < min || item.amount > max) return false;
        }
      }

      return true;
    });
  }, [
    payments,
    searchQuery,
    filterReason,
    filterMethod,
    filterProbability,
    filterAction,
    filterPriority,
    filterStatus,
    filterAmountRange,
    customMinAmount,
    customMaxAmount,
  ]);

  // Sorted list
  const sortedPayments = useMemo(() => {
    const list = [...filteredPayments];
    return list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'id':
          comparison = a.id.localeCompare(b.id);
          break;
        case 'customer':
          comparison = a.customer.customerName.localeCompare(b.customer.customerName);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'paymentMethod':
          comparison = a.paymentMethod.localeCompare(b.paymentMethod);
          break;
        case 'failureReason':
          comparison = a.failureReason.localeCompare(b.failureReason);
          break;
        case 'recoveryProbability':
          comparison = a.recoveryProbability - b.recoveryProbability;
          break;
        case 'expectedRecoveryValue':
          comparison = a.expectedRecoveryValue - b.expectedRecoveryValue;
          break;
        case 'recommendedAction':
          comparison = a.recommendedAction.localeCompare(b.recommendedAction);
          break;
        case 'priority':
          comparison = (priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0);
          break;
        case 'status':
          comparison = (statusWeight[a.status] || 0) - (statusWeight[b.status] || 0);
          break;
        case 'failedAt':
          comparison = new Date(a.failedAt).getTime() - new Date(b.failedAt).getTime();
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredPayments, sortField, sortDirection]);

  // Paginated records
  const totalRecords = sortedPayments.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const paginatedPayments = sortedPayments.slice(startIndex, endIndex);

  // Active filters count
  const activeFiltersCount = [
    searchQuery !== '',
    filterReason !== 'all',
    filterMethod !== 'all',
    filterProbability !== 'all',
    filterAction !== 'all',
    filterPriority !== 'all',
    filterStatus !== 'all',
    filterAmountRange !== 'all',
  ].filter(Boolean).length;

  // Aggregate stats of current filtered list
  const filteredGrossAtRisk = useMemo(
    () => filteredPayments.reduce((acc, p) => acc + p.amount, 0),
    [filteredPayments]
  );
  const filteredTotalExpected = useMemo(
    () => filteredPayments.reduce((acc, p) => acc + p.expectedRecoveryValue, 0),
    [filteredPayments]
  );
  const filteredAvgProbability = useMemo(
    () =>
      filteredPayments.length > 0
        ? filteredPayments.reduce((acc, p) => acc + p.recoveryProbability, 0) / filteredPayments.length
        : 0,
    [filteredPayments]
  );

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-stone-300 opacity-60 group-hover:opacity-100" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-stone-900" />
    ) : (
      <ArrowDown className="w-3 h-3 text-stone-900" />
    );
  };

  const handleInspect = (item: PaymentRecord) => {
    onSelectPayment(item);
    if (onNavigateToPayment) {
      onNavigateToPayment(item.id);
    }
  };

  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'card':
        return <CreditCard className="w-3.5 h-3.5 text-stone-600 shrink-0" />;
      case 'upi':
        return <Smartphone className="w-3.5 h-3.5 text-amber-700 shrink-0" />;
      case 'mandate':
        return <Building className="w-3.5 h-3.5 text-indigo-700 shrink-0" />;
      case 'netbanking':
        return <Building className="w-3.5 h-3.5 text-emerald-700 shrink-0" />;
      case 'wallet':
        return <Wallet className="w-3.5 h-3.5 text-stone-600 shrink-0" />;
      default:
        return <CreditCard className="w-3.5 h-3.5 text-stone-600 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Editorial Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#E6E2D8]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-900 font-bold bg-amber-50 px-2 py-0.5 border border-amber-300">
              ACME COMMERCE • OPERATIONS WORKLIST • LIVE RECOVERY PIPELINE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif-editorial tracking-tight text-stone-900 mt-1">
            At-Risk Payments Worklist
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-serif-editorial italic mt-0.5 max-w-3xl">
            Real-time operations queue of Acme Commerce customer failed payments with ML recovery attribution,
            dynamic priority scoring, and deterministic guardrail policy enforcement.
          </p>
        </div>

        {/* Live Filter Telemetry Strip */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap bg-white border border-[#E6E2D8] p-3 sm:px-4 sm:py-2 shadow-sm">
          <div className="text-left">
            <div className="text-[10px] uppercase font-mono text-stone-500">Filtered Target Queue</div>
            <div className="font-mono font-bold text-stone-900 text-sm sm:text-base">
              {totalRecords} <span className="text-[10px] text-stone-400 font-normal">/ {payments.length} total</span>
            </div>
          </div>
          <div className="h-7 w-[1px] bg-[#E6E2D8] hidden sm:block" />
          <div className="text-left">
            <div className="text-[10px] uppercase font-mono text-amber-800 font-semibold">Gross at Risk</div>
            <div className="font-mono font-bold text-stone-900 text-sm sm:text-base">
              {formatINR(filteredGrossAtRisk, { compact: true })}
            </div>
          </div>
          <div className="h-7 w-[1px] bg-[#E6E2D8] hidden sm:block" />
          <div className="text-left">
            <div className="text-[10px] uppercase font-mono text-emerald-800 font-semibold">Expected Yield (EV)</div>
            <div className="font-mono font-bold text-emerald-900 text-sm sm:text-base">
              {formatINR(filteredTotalExpected, { compact: true })}
            </div>
          </div>
          <div className="h-7 w-[1px] bg-[#E6E2D8] hidden sm:block" />
          <div className="text-left">
            <div className="text-[10px] uppercase font-mono text-indigo-800 font-semibold">Avg Recovery Prob</div>
            <div className="font-mono font-bold text-indigo-950 text-sm sm:text-base">
              {formatPercent(filteredAvgProbability)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Filter Presets Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-mono">
        <span className="text-stone-400 text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap">
          Quick Filters:
        </span>
        <button
          onClick={() => handlePreset('high_value')}
          className={`px-2.5 py-1 border transition-colors whitespace-nowrap ${
            filterAmountRange === 'gt_100k'
              ? 'bg-stone-900 text-stone-50 border-stone-900'
              : 'bg-white border-[#E6E2D8] text-stone-700 hover:bg-[#FAF9F5]'
          }`}
        >
          High Ticket (≥₹1.0L)
        </button>
        <button
          onClick={() => handlePreset('critical')}
          className={`px-2.5 py-1 border transition-colors whitespace-nowrap ${
            filterPriority === 'critical'
              ? 'bg-stone-900 text-stone-50 border-stone-900'
              : 'bg-white border-[#E6E2D8] text-stone-700 hover:bg-[#FAF9F5]'
          }`}
        >
          Critical Priority
        </button>
        <button
          onClick={() => handlePreset('high_prob')}
          className={`px-2.5 py-1 border transition-colors whitespace-nowrap ${
            filterProbability === 'high_gt_75'
              ? 'bg-stone-900 text-stone-50 border-stone-900'
              : 'bg-white border-[#E6E2D8] text-stone-700 hover:bg-[#FAF9F5]'
          }`}
        >
          High Recovery Prob (≥75%)
        </button>
        <button
          onClick={() => handlePreset('upi')}
          className={`px-2.5 py-1 border transition-colors whitespace-nowrap ${
            filterMethod === 'upi'
              ? 'bg-stone-900 text-stone-50 border-stone-900'
              : 'bg-white border-[#E6E2D8] text-stone-700 hover:bg-[#FAF9F5]'
          }`}
        >
          UPI Decline Cases
        </button>
        <button
          onClick={() => handlePreset('expired_card')}
          className={`px-2.5 py-1 border transition-colors whitespace-nowrap ${
            filterReason === 'card_expired'
              ? 'bg-stone-900 text-stone-50 border-stone-900'
              : 'bg-white border-[#E6E2D8] text-stone-700 hover:bg-[#FAF9F5]'
          }`}
        >
          Expired Card Tokens
        </button>

        {activeFiltersCount > 0 && (
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-950 border border-amber-300 hover:bg-amber-100 transition-colors ml-auto whitespace-nowrap"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All ({activeFiltersCount})</span>
          </button>
        )}
      </div>

      {/* Main Filter & Search Control Tower */}
      <div className="bg-white border border-[#E6E2D8] p-4 sm:p-5 shadow-sm space-y-4">
        {/* Row 1: Search and Primary Selects */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input (5 Cols) */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Payment ID, Customer name, Email, or Error Code..."
              className="w-full bg-[#FAF9F5] border border-[#E6E2D8] pl-9 pr-8 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-800 transition-colors font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Failure Reason Select (2 Cols) */}
          <div className="md:col-span-2">
            <select
              value={filterReason}
              onChange={(e) => {
                setFilterReason(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#FAF9F5] border border-[#E6E2D8] px-2.5 py-2 text-xs text-stone-800 focus:outline-none focus:border-stone-800 font-sans truncate"
            >
              <option value="all">All Failure Causes</option>
              <option value="insufficient_funds">Insufficient Funds</option>
              <option value="technical_glitch">Issuer / Gateway Glitch</option>
              <option value="limit_exceeded">Transaction Limit Exceeded</option>
              <option value="card_expired">Card Expired</option>
              <option value="auth_timeout">OTP / 3DS Timeout</option>
              <option value="mandate_invalid">Mandate Invalid / Paused</option>
              <option value="customer_dropoff">Customer Abandoned Auth</option>
            </select>
          </div>

          {/* Payment Method Select (2 Cols) */}
          <div className="md:col-span-2">
            <select
              value={filterMethod}
              onChange={(e) => {
                setFilterMethod(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#FAF9F5] border border-[#E6E2D8] px-2.5 py-2 text-xs text-stone-800 focus:outline-none focus:border-stone-800 font-sans truncate"
            >
              <option value="all">All Payment Rails</option>
              <option value="card">Cards (Credit / Debit)</option>
              <option value="upi">UPI (Auto & Intent)</option>
              <option value="mandate">E-Mandate / Recurring SI</option>
              <option value="netbanking">NetBanking Corporate</option>
              <option value="wallet">Prepaid Wallets</option>
            </select>
          </div>

          {/* Priority Select (1.5 Cols) */}
          <div className="md:col-span-1.5">
            <select
              value={filterPriority}
              onChange={(e) => {
                setFilterPriority(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#FAF9F5] border border-[#E6E2D8] px-2.5 py-2 text-xs text-stone-800 focus:outline-none focus:border-stone-800 font-sans truncate"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Toggle More Filters Button (1.5 Cols) */}
          <div className="md:col-span-1.5">
            <button
              onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono border transition-colors ${
                isAdvancedFiltersOpen || activeFiltersCount > 3
                  ? 'bg-stone-900 text-stone-50 border-stone-900'
                  : 'bg-[#FAF9F5] border-[#E6E2D8] text-stone-700 hover:bg-stone-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>More Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-stone-950 font-mono text-[10px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Collapsible Advanced Filters Drawer */}
        {isAdvancedFiltersOpen && (
          <div className="pt-3 border-t border-[#F0ECE1] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs animate-in fade-in duration-200">
            {/* Probability Range Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-stone-500 font-semibold">
                Recovery Probability
              </label>
              <select
                value={filterProbability}
                onChange={(e) => {
                  setFilterProbability(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#FAF9F5] border border-[#E6E2D8] px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-stone-800"
              >
                <option value="all">All Probability Ranges</option>
                <option value="very_high_gt_85">Very High (≥ 85%)</option>
                <option value="high_gt_75">High (≥ 75%)</option>
                <option value="mid_40_75">Moderate (40% - 75%)</option>
                <option value="low_lt_40">Low / Unlikely (&lt; 40%)</option>
              </select>
            </div>

            {/* Recommended Action Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-stone-500 font-semibold">
                AI Recommended Action
              </label>
              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#FAF9F5] border border-[#E6E2D8] px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-stone-800"
              >
                <option value="all">All Recommended Actions</option>
                <option value="retry_now">Retry Now (Immediate)</option>
                <option value="retry_later">Retry Later (Smart Delay)</option>
                <option value="send_payment_link">Send Payment Link</option>
                <option value="send_reminder">Send Customer Reminder</option>
                <option value="request_payment_method_update">Request Method Update</option>
                <option value="escalate_to_human">Escalate to RM / Ops</option>
                <option value="stop_recovery">Stop Recovery (Abandon)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-stone-500 font-semibold">
                Payment State / Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#FAF9F5] border border-[#E6E2D8] px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-stone-800"
              >
                <option value="all">All Pipeline Statuses</option>
                <option value="at_risk">At Risk (Pending Action)</option>
                <option value="recovering">Recovering (In Flight)</option>
                <option value="recovered">Recovered (Success)</option>
                <option value="failed">Failed (Declined)</option>
                <option value="abandoned">Abandoned (Terminated)</option>
              </select>
            </div>

            {/* Amount Range Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-stone-500 font-semibold">
                Gross Amount Range
              </label>
              <select
                value={filterAmountRange}
                onChange={(e) => {
                  setFilterAmountRange(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#FAF9F5] border border-[#E6E2D8] px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-stone-800"
              >
                <option value="all">All Amounts</option>
                <option value="gt_100k">&gt; ₹1,00,000 (Enterprise)</option>
                <option value="50k_100k">₹50,000 – ₹1,00,000</option>
                <option value="20k_50k">₹20,000 – ₹50,000</option>
                <option value="lt_20k">&lt; ₹20,000 (Retail/SMB)</option>
                <option value="custom">Custom Min / Max (₹)</option>
              </select>

              {filterAmountRange === 'custom' && (
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    value={customMinAmount}
                    onChange={(e) => setCustomMinAmount(e.target.value)}
                    placeholder="Min ₹"
                    className="w-1/2 bg-white border border-[#E6E2D8] px-2 py-1 text-[11px] font-mono"
                  />
                  <span className="text-stone-400 font-mono">-</span>
                  <input
                    type="number"
                    value={customMaxAmount}
                    onChange={(e) => setCustomMaxAmount(e.target.value)}
                    placeholder="Max ₹"
                    className="w-1/2 bg-white border border-[#E6E2D8] px-2 py-1 text-[11px] font-mono"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Sortable Table Component */}
      <div className="bg-white border border-[#E6E2D8] p-5 sm:p-6 shadow-sm space-y-4">
        {/* Table Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F0ECE1]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-stone-700" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900">
              Operations Worklist Ledger
            </h2>
            <span className="text-xs text-stone-400">|</span>
            <span className="text-xs font-mono text-stone-600">
              Showing {totalRecords === 0 ? 0 : startIndex + 1}–{endIndex} of {totalRecords} records
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-stone-600">
            <span>Sort Field:</span>
            <span className="font-bold text-stone-900 uppercase">{sortField}</span>
            <span className="text-stone-400">({sortDirection.toUpperCase()})</span>
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto border border-[#E6E2D8]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF9F5] text-stone-700 uppercase tracking-wider font-mono text-[10px] border-b border-[#E6E2D8] select-none">
                {/* Payment ID */}
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-3 cursor-pointer hover:bg-stone-200/60 transition-colors group whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Payment ID</span>
                    {renderSortIndicator('id')}
                  </div>
                </th>

                {/* Customer */}
                <th
                  onClick={() => handleSort('customer')}
                  className="py-3 px-3 cursor-pointer hover:bg-stone-200/60 transition-colors group whitespace-nowrap min-w-[180px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Customer</span>
                    {renderSortIndicator('customer')}
                  </div>
                </th>

                {/* Amount */}
                <th
                  onClick={() => handleSort('amount')}
                  className="py-3 px-3 cursor-pointer hover:bg-stone-200/60 transition-colors group whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Amount</span>
                    {renderSortIndicator('amount')}
                  </div>
                </th>

                {/* Payment Method */}
                <th
                  onClick={() => handleSort('paymentMethod')}
                  className="py-3 px-3 cursor-pointer hover:bg-stone-200/60 transition-colors group whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Payment Method</span>
                    {renderSortIndicator('paymentMethod')}
                  </div>
                </th>

                {/* Failure Reason */}
                <th
                  onClick={() => handleSort('failureReason')}
                  className="py-3 px-3 cursor-pointer hover:bg-stone-200/60 transition-colors group whitespace-nowrap min-w-[150px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Failure Reason</span>
                    {renderSortIndicator('failureReason')}
                  </div>
                </th>

                {/* Recovery Probability */}
                <th
                  onClick={() => handleSort('recoveryProbability')}
                  className="py-3 px-3 cursor-pointer hover:bg-stone-200/60 transition-colors group whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Recovery Likelihood</span>
                    {renderSortIndicator('recoveryProbability')}
                  </div>
                </th>

                {/* Expected Recovery Value (EV) */}
                <th
                  onClick={() => handleSort('expectedRecoveryValue')}
                  className="py-3 px-3 cursor-pointer hover:bg-stone-200/60 transition-colors group whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Expected Recovery</span>
                    {renderSortIndicator('expectedRecoveryValue')}
                  </div>
                </th>

                {/* Recommended Action */}
                <th
                  onClick={() => handleSort('recommendedAction')}
                  className="py-3 px-3 cursor-pointer hover:bg-stone-200/60 transition-colors group whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>RecoverIQ Recommends</span>
                    {renderSortIndicator('recommendedAction')}
                  </div>
                </th>

                {/* Priority */}
                <th
                  onClick={() => handleSort('priority')}
                  className="py-3 px-3 cursor-pointer hover:bg-stone-200/60 transition-colors group whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Priority</span>
                    {renderSortIndicator('priority')}
                  </div>
                </th>

                {/* Status */}
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-3 cursor-pointer hover:bg-stone-200/60 transition-colors group whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    {renderSortIndicator('status')}
                  </div>
                </th>

                {/* Inspect Action */}
                <th className="py-3 px-3 text-right whitespace-nowrap">
                  <span>View Decision</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EAE6DD] bg-white">
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 px-4 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-stone-100 rounded-none border border-stone-300">
                        <Filter className="w-5 h-5 text-stone-500" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold font-serif-editorial text-stone-900">
                          No matching payments found
                        </h3>
                        <p className="text-xs text-stone-500 font-mono">
                          Adjust your search query or reset active filters to view pipeline records.
                        </p>
                      </div>
                      <button
                        onClick={handleResetFilters}
                        className="px-3.5 py-1.5 bg-stone-900 text-stone-50 text-xs font-mono font-semibold uppercase hover:bg-stone-800 transition-colors"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleInspect(item)}
                    className="hover:bg-[#FAF9F5] transition-colors group cursor-pointer"
                  >
                    {/* Payment ID & Age */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-stone-900 group-hover:text-amber-900 transition-colors">
                        {item.id}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {formatRelativeTime(item.failedAt)}
                      </div>
                    </td>

                    {/* Customer Info */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-stone-900 truncate max-w-[200px]" title={item.customer.customerName}>
                        {item.customer.customerName}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono truncate max-w-[200px]" title={item.customer.email}>
                        <span className="font-bold text-stone-700">{item.customer.segment}</span> • LTV: {formatINR(item.customer.lifetimeValue)}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3 font-mono font-bold text-stone-900 whitespace-nowrap">
                      {formatINR(item.amount, { compact: false })}
                    </td>

                    {/* Payment Method */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-stone-800 font-medium">
                        {getMethodIcon(item.paymentMethod)}
                        <span>{formatPaymentMethod(item.paymentMethod)}</span>
                      </div>
                      <div className="text-[10px] font-mono text-stone-500 truncate max-w-[140px]" title={item.paymentMethodDetails}>
                        {item.paymentMethodDetails}
                      </div>
                    </td>

                    {/* Failure Reason */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="text-stone-800 font-medium">
                        {formatFailureReason(item.failureReason)}
                      </div>
                      <div className="text-[10px] font-mono text-rose-800 font-semibold truncate max-w-[160px]" title={item.failureCode}>
                        {item.failureCode}
                      </div>
                    </td>

                    {/* Recovery Probability */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <ProbabilityBadge probability={item.recoveryProbability} size="sm" showBar={false} />
                    </td>

                    {/* Expected Recovery Value (EV) */}
                    <td className="py-3 px-3 font-mono font-bold text-emerald-900 whitespace-nowrap">
                      {formatINR(item.expectedRecoveryValue, { compact: false })}
                    </td>

                    {/* Recommended Action */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-950 font-mono text-[11px] font-semibold whitespace-nowrap">
                        {formatActionShortLabel(item.recommendedAction)}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <PriorityBadge priority={item.priority} />
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>

                    {/* View Decision Button */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspect(item);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider bg-white border border-stone-800 text-stone-900 group-hover:bg-stone-900 group-hover:text-stone-50 transition-colors shadow-xs"
                      >
                        <span>View Decision</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Rows Per Page Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-[#F0ECE1] text-xs font-mono text-stone-600">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#FAF9F5] border border-[#E6E2D8] px-2 py-1 text-xs text-stone-800 focus:outline-none focus:border-stone-800"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Page Indicator & Navigator */}
          <div className="flex items-center gap-2">
            <span className="text-stone-500 mr-2">
              Page <span className="font-bold text-stone-900">{validCurrentPage}</span> of{' '}
              <span className="font-bold text-stone-900">{totalPages}</span>
            </span>

            <button
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage === 1}
              className="p-1.5 border border-[#E6E2D8] bg-white text-stone-800 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setCurrentPage(validCurrentPage - 1)}
              disabled={validCurrentPage === 1}
              className="p-1.5 border border-[#E6E2D8] bg-white text-stone-800 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Quick Page Number Pills */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && validCurrentPage > 3) {
                  pageNum = validCurrentPage - 3 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                if (pageNum <= 0 || pageNum > totalPages) return null;

                const isCurrent = pageNum === validCurrentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 text-xs font-mono font-semibold flex items-center justify-center border transition-colors ${
                      isCurrent
                        ? 'bg-stone-900 text-stone-50 border-stone-900 font-bold'
                        : 'bg-white border-[#E6E2D8] text-stone-700 hover:bg-[#FAF9F5]'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(validCurrentPage + 1)}
              disabled={validCurrentPage === totalPages}
              className="p-1.5 border border-[#E6E2D8] bg-white text-stone-800 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage === totalPages}
              className="p-1.5 border border-[#E6E2D8] bg-white text-stone-800 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
