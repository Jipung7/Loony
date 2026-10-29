import React, { useState, useMemo } from 'react';
import { Wallet, Pin, Trash2, Check } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export interface FinanceTabProps {
  isFullScreen: boolean;
}

/**
 * Tab Keuangan (Dompet Cerdas, Safe-to-Spend Harian, Pengeluaran, Tagihan, dan Tanggungan/Piutang)
 */
export const FinanceTab: React.FC<FinanceTabProps> = ({ isFullScreen }) => {
  const {
    budgetConfig,
    safeToSpend,
    expenses,
    addExpense,
    addIncome,
    updateExpense,
    deleteExpense,
    updateBudgetBalance,
    toggleMandatoryBillPaid,
    addMandatoryBill,
    updateMandatoryBill,
    deleteMandatoryBill,
    debts,
    addDebt,
    markDebtPaid,
    deleteDebt,
    settings,
    formatMoney,
    t,
  } = useApp();

  const isEn = (settings.language || 'en') === 'en';

  // Balance Edit Form State
  const [showEditBalance, setShowEditBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');

  // Transaction (Expense/Income) Form & Filter States
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [txFormType, setTxFormType] = useState<'expense' | 'income'>('expense');
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expenseFilter, setExpenseFilter] = useState<'today' | 'yesterday' | 'all'>('today');

  // Mandatory Bills Form State
  const [showAddBill, setShowAddBill] = useState(false);
  const [billTitle, setBillTitle] = useState('');
  const [billAmount, setBillAmount] = useState('');

  // Debts & Receivables Form State
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [debtPerson, setDebtPerson] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtType, setDebtType] = useState<'hutang' | 'piutang'>('hutang');

  // Inline Editing State for Expenses and Bills
  const [editingItem, setEditingItem] = useState<{
    type: 'expense' | 'bill';
    id: string;
    text: string;
    secondary?: string;
  } | null>(null);

  // Date Keys for Filtering
  const todayISO = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const yestISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const expISO = exp.cycleDate || (exp.createdAt ? exp.createdAt.slice(0, 10) : todayISO);
      if (expenseFilter === 'today') return expISO === todayISO;
      if (expenseFilter === 'yesterday') return expISO === yestISO;
      return true;
    });
  }, [expenses, expenseFilter, todayISO, yestISO]);

  const unpaidDebts = useMemo(() => debts.filter((d) => !d.isPaid), [debts]);

  const safeStatusTextClass =
    safeToSpend.statusLevel === 'danger'
      ? 'text-rose-400'
      : safeToSpend.statusLevel === 'warning'
        ? 'text-amber-400'
        : 'text-zinc-100';

  // Handlers
  const handleSaveBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(balanceInput.replace(/[^0-9]/g, ''));
    if (!Number.isNaN(num)) {
      updateBudgetBalance(num);
    }
    setShowEditBalance(false);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(expAmount.replace(/[^0-9]/g, ''));
    if (!expTitle.trim() || !num) return;
    if (txFormType === 'income') {
      addIncome(num, expTitle.trim());
    } else {
      addExpense(num, expTitle.trim());
    }
    setExpTitle('');
    setExpAmount('');
    setShowAddExpense(false);
  };

  const handleAddBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(billAmount.replace(/[^0-9]/g, ''));
    if (!billTitle.trim() || !num) return;
    addMandatoryBill(billTitle.trim(), num);
    setBillTitle('');
    setBillAmount('');
    setShowAddBill(false);
  };

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(debtAmount.replace(/[^0-9]/g, ''));
    if (!debtPerson.trim() || !num) return;
    addDebt(debtPerson.trim(), num, debtType, '');
    setDebtPerson('');
    setDebtAmount('');
    setShowAddDebt(false);
  };

  const handleCommitInlineEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingItem) return;
    const { type, id, text, secondary } = editingItem;
    const trimmed = text.trim();
    if (trimmed) {
      if (type === 'expense') {
        const amt = Number((secondary || '').replace(/[^0-9]/g, ''));
        if (amt > 0) updateExpense(id, { title: trimmed, amount: amt });
      } else if (type === 'bill') {
        const amt = Number((secondary || '').replace(/[^0-9]/g, ''));
        if (amt > 0) updateMandatoryBill(id, { title: trimmed, amount: amt });
      }
    }
    setEditingItem(null);
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-5 overflow-hidden">
      {/* Header Angka Utama */}
      <div className="flex items-end justify-between pb-4 border-b border-white/[0.05] shrink-0">
        <div>
          <div className="text-[11px] text-zinc-500">
            {isEn
              ? `Daily Safe-to-Spend (${safeToSpend.remainingDaysInCycle} days until cycle day ${budgetConfig.cycleEndDay})`
              : `Batas Aman Hari Ini (${safeToSpend.remainingDaysInCycle} hari menuju tgl ${budgetConfig.cycleEndDay})`}
          </div>
          <div className={`text-2xl font-bold tracking-tight tabular-nums mt-0.5 ${safeStatusTextClass}`}>
            {formatMoney(Math.round(safeToSpend.remainingSafeToday))}
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          {isFullScreen && (
            <div className="text-right">
              <div className="text-[10px] text-zinc-500">{t.finance.projectedTomorrow}</div>
              <div className="text-sm font-semibold text-zinc-300 tabular-nums">
                {formatMoney(Math.round(safeToSpend.projectedTomorrowAllowance))}
              </div>
            </div>
          )}

          <div className="text-right">
            <div className="text-[10px] text-zinc-500">{t.finance.spentToday}</div>
            <div className="text-sm font-semibold text-zinc-300 tabular-nums">
              {formatMoney(safeToSpend.spentToday)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-zinc-500">{t.finance.activeBalance}</div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-200 tabular-nums">
                {formatMoney(budgetConfig.activeBalance)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setBalanceInput(String(budgetConfig.activeBalance));
                  setShowEditBalance((p) => !p);
                }}
                className="px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-white/[0.09] text-[10px] text-zinc-300 cursor-pointer"
              >
                {t.common.edit}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showEditBalance && (
        <form
          onSubmit={handleSaveBalance}
          className="flex items-center gap-2 pb-3 border-b border-white/[0.04] shrink-0"
        >
          <span className="text-xs text-zinc-400">
            {isEn
              ? `New Active Balance (${settings.currencySymbol || '$'}):`
              : `Saldo Aktif Baru (${settings.currencySymbol || 'Rp'}):`}
          </span>
          <input
            type="text"
            autoFocus
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value)}
            className="bg-white/[0.04] rounded-lg px-3 py-1 text-xs text-zinc-100 focus:outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-semibold cursor-pointer"
          >
            {t.common.save}
          </button>
        </form>
      )}

      {/* Kolom Bawah Keuangan */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-6 overflow-hidden">
        {/* Kolom 1: Riwayat Pengeluaran & Catat Pemasukan */}
        <div
          className={`${
            isFullScreen ? 'col-span-5' : 'col-span-7'
          } h-full min-h-0 flex flex-col overflow-hidden`}
        >
          <div className="flex flex-col gap-2 pb-2.5 mb-2 border-b border-white/[0.04] shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                <Wallet className="w-3.5 h-3.5 text-emerald-400/90" />
                <span>{t.finance.expensesHeading}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (showAddExpense && txFormType === 'income') {
                      setShowAddExpense(false);
                    } else {
                      setTxFormType('income');
                      setShowAddExpense(true);
                    }
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition cursor-pointer shrink-0 whitespace-nowrap ${
                    showAddExpense && txFormType === 'income'
                      ? 'bg-emerald-400 text-zinc-950 font-semibold'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200'
                  }`}
                >
                  {isEn ? '+ Income' : '+ Pemasukan'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (showAddExpense && txFormType === 'expense') {
                      setShowAddExpense(false);
                    } else {
                      setTxFormType('expense');
                      setShowAddExpense(true);
                    }
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition cursor-pointer shrink-0 whitespace-nowrap ${
                    showAddExpense && txFormType === 'expense'
                      ? 'bg-zinc-100 text-zinc-950 font-semibold'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white'
                  }`}
                >
                  {isEn ? '+ Expense' : '+ Pengeluaran'}
                </button>
              </div>
            </div>

            {/* Filter Periode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.03] p-0.5">
                {(
                  [
                    { id: 'today', label: t.common.today },
                    { id: 'yesterday', label: t.common.yesterday },
                    { id: 'all', label: t.common.all },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setExpenseFilter(f.id)}
                    className={`px-2 py-0.5 rounded-md text-[10px] cursor-pointer transition ${
                      expenseFilter === f.id
                        ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-zinc-500 tabular-nums">
                {filteredExpenses.length} {isEn ? 'transactions' : 'transaksi'}
              </span>
            </div>
          </div>

          {showAddExpense && (
            <form
              onSubmit={handleAddExpense}
              className="flex gap-1.5 mb-2.5 pb-2.5 border-b border-white/[0.04] shrink-0"
            >
              <input
                type="text"
                autoFocus
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
                placeholder={
                  txFormType === 'income'
                    ? isEn ? 'Income source...' : 'Sumber pemasukan...'
                    : isEn ? 'Expense item...' : 'Nama pengeluaran...'
                }
                className="flex-1 min-w-0 bg-white/[0.04] rounded-lg px-2.5 py-1 text-xs text-zinc-100 focus:outline-none"
              />
              <input
                type="text"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder={isEn ? `Amount (${settings.currencySymbol || '$'})...` : `Nominal ${settings.currencySymbol || 'Rp'}...`}
                className="w-24 shrink-0 bg-white/[0.04] rounded-lg px-2.5 py-1 text-xs text-zinc-100 focus:outline-none"
              />
              <button
                type="submit"
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer shrink-0 ${
                  txFormType === 'income'
                    ? 'bg-emerald-400 text-zinc-950'
                    : 'bg-zinc-100 text-zinc-950'
                }`}
              >
                {txFormType === 'income' ? (isEn ? '+ Balance' : '+ Saldo') : (isEn ? 'Log' : 'Catat')}
              </button>
            </form>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/[0.03] pr-1">
            {filteredExpenses.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-600">
                {expenseFilter === 'today'
                  ? isEn ? 'No expenses recorded today.' : 'Belum ada pengeluaran hari ini.'
                  : expenseFilter === 'yesterday'
                    ? isEn ? 'No expenses recorded yesterday.' : 'Tidak ada pengeluaran tercatat kemarin.'
                    : isEn ? 'No expenses recorded yet.' : 'Belum ada pengeluaran tercatat.'}
              </div>
            ) : (
              filteredExpenses.slice(0, 30).map((exp) => {
                const isEditing = editingItem?.type === 'expense' && editingItem.id === exp.id;
                return (
                  <div
                    key={exp.id}
                    className="group flex items-center justify-between py-2 px-1.5 rounded-lg hover:bg-white/[0.02] transition"
                  >
                    {isEditing ? (
                      <form
                        onSubmit={handleCommitInlineEdit}
                        className="flex items-center gap-1.5 w-full"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={editingItem.text}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              text: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setEditingItem(null);
                          }}
                          className="flex-1 bg-white/[0.06] rounded-md px-2 py-0.5 text-xs text-zinc-100 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={editingItem.secondary}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              secondary: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setEditingItem(null);
                          }}
                          className="w-24 bg-white/[0.06] rounded-md px-2 py-0.5 text-xs text-zinc-100 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-950 text-[10px] font-semibold cursor-pointer"
                        >
                          OK
                        </button>
                      </form>
                    ) : (
                      <>
                        <span
                          onClick={() =>
                            setEditingItem({
                              type: 'expense',
                              id: exp.id,
                              text: exp.title,
                              secondary: String(exp.amount),
                            })
                          }
                          title="Klik untuk mengedit"
                          className="truncate text-xs text-zinc-300 cursor-text hover:underline decoration-white/20 underline-offset-2"
                        >
                          {exp.title}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            onClick={() =>
                              setEditingItem({
                                type: 'expense',
                                id: exp.id,
                                text: exp.title,
                                secondary: String(exp.amount),
                              })
                            }
                            title={t.finance.clickToEditAmount}
                            className="text-xs font-medium text-zinc-200 hover:text-white tabular-nums cursor-pointer"
                          >
                            {formatMoney(exp.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteExpense(exp.id)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Kolom 2 Khusus Full Screen (3/12): Tagihan Rutin Bulanan */}
        {isFullScreen && (
          <div className="col-span-3 h-full min-h-0 flex flex-col pl-6 border-l border-white/[0.04] overflow-hidden">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.04] shrink-0">
              <span className="text-xs font-semibold text-zinc-200">
                {isEn ? 'Monthly Bills' : 'Tagihan Rutin'}
              </span>
              <button
                type="button"
                onClick={() => setShowAddBill((p) => !p)}
                className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-zinc-300 hover:text-white cursor-pointer"
              >
                {isEn ? '+ Bill' : '+ Tagihan'}
              </button>
            </div>

            {showAddBill && (
              <form
                onSubmit={handleAddBillSubmit}
                className="flex flex-col gap-1.5 mb-2.5 pb-2.5 border-b border-white/[0.04] shrink-0"
              >
                <input
                  type="text"
                  autoFocus
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  placeholder={isEn ? 'Bill name (Rent, Internet...)' : 'Nama tagihan (Kos, Wi-Fi...)'}
                  className="bg-white/[0.04] rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                />
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder={isEn ? `Amount (${settings.currencySymbol || '$'})...` : `Nominal ${settings.currencySymbol || 'Rp'}...`}
                    className="flex-1 bg-white/[0.04] rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-950 text-[10px] font-semibold cursor-pointer"
                  >
                    {t.common.save}
                  </button>
                </div>
              </form>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/[0.03] pr-1">
              {budgetConfig.mandatoryBills.length === 0 ? (
                <div className="py-10 text-center text-xs text-zinc-600">
                  {isEn ? 'No monthly bills registered.' : 'Belum ada tagihan bulanan tetap.'}
                </div>
              ) : (
                budgetConfig.mandatoryBills.map((bill) => {
                  const isEditing = editingItem?.type === 'bill' && editingItem.id === bill.id;
                  return (
                    <div
                      key={bill.id}
                      className="group flex items-center justify-between py-2 px-1 rounded-lg hover:bg-white/[0.02] transition"
                    >
                      {isEditing ? (
                        <form
                          onSubmit={handleCommitInlineEdit}
                          className="flex flex-col gap-1 w-full"
                        >
                          <input
                            type="text"
                            autoFocus
                            value={editingItem.text}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                text: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') setEditingItem(null);
                            }}
                            className="bg-white/[0.06] rounded-md px-2 py-0.5 text-xs text-zinc-100 focus:outline-none"
                          />
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={editingItem.secondary}
                              onChange={(e) =>
                                setEditingItem({
                                  ...editingItem,
                                  secondary: e.target.value,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') setEditingItem(null);
                              }}
                              className="flex-1 bg-white/[0.06] rounded-md px-2 py-0.5 text-xs text-zinc-100 focus:outline-none"
                            />
                            <button
                              type="submit"
                              className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-950 text-[10px] font-semibold cursor-pointer"
                            >
                              OK
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => toggleMandatoryBillPaid(bill.id)}
                              className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 cursor-pointer ${
                                bill.isPaidThisMonth
                                  ? 'bg-zinc-100 text-zinc-950'
                                  : 'border border-zinc-600 text-transparent'
                              }`}
                            >
                              {bill.isPaidThisMonth && (
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              )}
                            </button>
                            <div
                              onClick={() =>
                                setEditingItem({
                                  type: 'bill',
                                  id: bill.id,
                                  text: bill.title,
                                  secondary: String(bill.amount),
                                })
                              }
                              title="Klik untuk mengedit tagihan"
                              className="min-w-0 flex-1 cursor-text"
                            >
                              <div
                                className={`truncate text-xs hover:underline decoration-white/20 underline-offset-2 ${
                                  bill.isPaidThisMonth
                                    ? 'line-through text-zinc-500'
                                    : 'text-zinc-200'
                                }`}
                              >
                                {bill.title}
                              </div>
                              <div className="text-[10px] text-zinc-500 tabular-nums">
                                {formatMoney(bill.amount)}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteMandatoryBill(bill.id)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Kolom Kanan: Pinjaman & Hutang */}
        <div
          className={`${
            isFullScreen ? 'col-span-4' : 'col-span-5'
          } h-full min-h-0 flex flex-col pl-6 border-l border-white/[0.04] overflow-hidden`}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.04] shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
              <Pin className="w-3.5 h-3.5 text-amber-400/90" />
              <span>{isEn ? 'Debts & Receivables' : 'Tanggungan & Tagihan'}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddDebt((p) => !p)}
              className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-zinc-300 hover:text-white cursor-pointer"
            >
              {isEn ? '+ Record' : '+ Catat'}
            </button>
          </div>

          {showAddDebt && (
            <form
              onSubmit={handleAddDebt}
              className="flex flex-col gap-1.5 mb-2.5 pb-2.5 border-b border-white/[0.04] shrink-0"
            >
              <div className="flex gap-1">
                <input
                  type="text"
                  autoFocus
                  value={debtPerson}
                  onChange={(e) => setDebtPerson(e.target.value)}
                  placeholder={isEn ? 'Person...' : 'Nama...'}
                  className="flex-1 bg-white/[0.04] rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                />
                <input
                  type="text"
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  placeholder={isEn ? `${settings.currencySymbol || '$'}...` : `${settings.currencySymbol || 'Rp'}...`}
                  className="w-20 bg-white/[0.04] rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {(['piutang', 'hutang'] as const).map((tVal) => (
                    <button
                      key={tVal}
                      type="button"
                      onClick={() => setDebtType(tVal)}
                      className={`px-2 py-0.5 rounded-md text-[10px] capitalize cursor-pointer ${
                        debtType === tVal
                          ? 'bg-zinc-100 text-zinc-950 font-semibold'
                          : 'bg-white/[0.04] text-zinc-400'
                      }`}
                    >
                      {tVal === 'hutang' ? (isEn ? 'I Owe' : 'Tanggungan') : (isEn ? 'Owed to Me' : 'Tagihan')}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  className="px-2.5 py-0.5 rounded-md bg-zinc-100 text-zinc-950 text-[10px] font-semibold cursor-pointer"
                >
                  {t.common.save}
                </button>
              </div>
            </form>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/[0.03] pr-1">
            {unpaidDebts.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-600">
                {isEn ? 'No active debts or receivables.' : 'Tidak ada tanggungan atau tagihan aktif.'}
              </div>
            ) : (
              unpaidDebts.map((d) => (
                <div
                  key={d.id}
                  className="group flex items-center justify-between py-2 px-1 rounded-lg hover:bg-white/[0.02] transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-zinc-200">
                      {d.person}{' '}
                      <span className="text-[10px] text-zinc-500 capitalize">
                        ({d.type === 'hutang' ? (isEn ? 'debt' : 'hutang') : (isEn ? 'receivable' : 'piutang')})
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 tabular-nums">
                      {formatMoney(d.amount)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => markDebtPaid(d.id)}
                      className="px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-[10px] text-zinc-300 cursor-pointer"
                    >
                      {isEn ? 'Paid' : 'Lunas'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDebt(d.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
