import { getDoc, getList, createDoc, updateDoc, deleteDoc } from '@/utils/frappe'

// ─── Finance API Composable ─────────────────────────────────────
// Uses Frappe's REST API with cookie-based auth (no tokens needed).

export function useFinanceApi() {
  const DOCTYPE_ACCOUNT = 'Hambaft Finance Account'
  const DOCTYPE_CATEGORY = 'Hambaft Finance Category'
  const DOCTYPE_TRANSACTION = 'Hambaft Transaction'
  const DOCTYPE_BUDGET = 'Hambaft Budget'
  const DOCTYPE_BUDGET_CATEGORY = 'Hambaft Budget Category'
  const DOCTYPE_SAVINGS = 'Hambaft Savings Goal'
  const DOCTYPE_BILL = 'Hambaft Bill'
  const DOCTYPE_SUBSCRIPTION = 'Hambaft Subscription'
  const DOCTYPE_RECURRENCE = 'Hambaft Recurrence Rule'
  const DOCTYPE_CURRENCY = 'Currency'

  // ── Accounts ──────────────────────────────────────────────────
  async function getAccounts() {
    const res = await getList(DOCTYPE_ACCOUNT, {
      fields: ['name', 'account_name', 'account_type', 'current_balance', 'currency', 'color', 'icon', 'bank_name', 'is_active', 'opening_balance', 'description'],
      order_by: 'account_name',
    })
    return res.data || []
  }

  async function getAccount(name) {
    const res = await getDoc(DOCTYPE_ACCOUNT, name)
    return res.data
  }

  async function createAccount(data) {
    return createDoc(DOCTYPE_ACCOUNT, data)
  }

  async function updateAccount(name, data) {
    return updateDoc(DOCTYPE_ACCOUNT, name, data)
  }

  async function deleteAccount(name) {
    return deleteDoc(DOCTYPE_ACCOUNT, name)
  }

  // ── Categories ────────────────────────────────────────────────
  async function getCategories() {
    const res = await getList(DOCTYPE_CATEGORY, {
      fields: ['name', 'category_name', 'category_type', 'parent_category', 'color', 'icon', 'description', 'is_group', 'lft', 'rgt'],
      order_by: 'lft',
    })
    return res.data || []
  }

  async function getCategory(name) {
    const res = await getDoc(DOCTYPE_CATEGORY, name)
    return res.data
  }

  async function createCategory(data) {
    return createDoc(DOCTYPE_CATEGORY, data)
  }

  async function updateCategory(name, data) {
    return updateDoc(DOCTYPE_CATEGORY, name, data)
  }

  async function deleteCategory(name) {
    return deleteDoc(DOCTYPE_CATEGORY, name)
  }

  // ── Transactions ──────────────────────────────────────────────
  async function getTransactions(filters = {}) {
    const baseFilters = []
    const res = await getList(DOCTYPE_TRANSACTION, {
      fields: ['name', 'transaction_type', 'transaction_date', 'amount', 'currency', 'account', 'to_account', 'category', 'description', 'is_recurring', 'recurrence_rule', 'linked_goal', 'reference_number'],
      filters: [...baseFilters, ...(filters.length ? filters : [])],
      order_by: 'transaction_date desc',
      limit: 100,
    })
    return res.data || []
  }

  async function getTransaction(name) {
    const res = await getDoc(DOCTYPE_TRANSACTION, name)
    return res.data
  }

  async function createTransaction(data) {
    return createDoc(DOCTYPE_TRANSACTION, data)
  }

  async function updateTransaction(name, data) {
    return updateDoc(DOCTYPE_TRANSACTION, name, data)
  }

  async function deleteTransaction(name) {
    return deleteDoc(DOCTYPE_TRANSACTION, name)
  }

  // ── Budgets ───────────────────────────────────────────────────
  async function getBudgets() {
    const res = await getList(DOCTYPE_BUDGET, {
      fields: ['name', 'budget_title', 'jalali_month', 'jalali_year', 'start_date', 'end_date', 'total_income_plan', 'total_expense_plan', 'total_saving_plan', 'status', 'categories'],

      order_by: 'jalali_year desc, jalali_month desc',
    })
    return res.data || []
  }

  async function getBudget(name) {
    const res = await getDoc(DOCTYPE_BUDGET, name)
    return res.data
  }

  async function createBudget(data) {
    return createDoc(DOCTYPE_BUDGET, data)
  }

  async function updateBudget(name, data) {
    return updateDoc(DOCTYPE_BUDGET, name, data)
  }

  async function deleteBudget(name) {
    return deleteDoc(DOCTYPE_BUDGET, name)
  }

  // ── Savings Goals ─────────────────────────────────────────────
  async function getSavingsGoals() {
    const res = await getList(DOCTYPE_SAVINGS, {
      fields: ['name', 'goal_name', 'target_amount', 'current_amount', 'target_date', 'monthly_contribution', 'account', 'progress', 'status', 'color', 'icon', 'linked_life_goal'],

      order_by: 'target_date',
    })
    return res.data || []
  }

  async function getSavingsGoal(name) {
    const res = await getDoc(DOCTYPE_SAVINGS, name)
    return res.data
  }

  async function createSavingsGoal(data) {
    return createDoc(DOCTYPE_SAVINGS, data)
  }

  async function updateSavingsGoal(name, data) {
    return updateDoc(DOCTYPE_SAVINGS, name, data)
  }

  async function deleteSavingsGoal(name) {
    return deleteDoc(DOCTYPE_SAVINGS, name)
  }

  async function contributeToGoal(name, amount, account) {
    const goal = await getSavingsGoal(name)
    const newAmount = (goal.current_amount || 0) + amount
    const progress = goal.target_amount > 0 ? (newAmount / goal.target_amount) * 100 : 0
    const status = progress >= 100 ? 'تکمیل‌شده' : goal.status
    return updateDoc(DOCTYPE_SAVINGS, name, {
      current_amount: newAmount,
      progress: Math.min(progress, 100),
      status,
    })
  }

  // ── Bills ─────────────────────────────────────────────────────
  async function getBills(filters = {}) {
    const baseFilters = []
    const res = await getList(DOCTYPE_BILL, {
      fields: ['name', 'bill_name', 'category', 'account', 'amount', 'due_date', 'is_recurring', 'recurrence_rule', 'status', 'paid_date', 'reminder_days_before'],
      filters: [...baseFilters, ...(filters.length ? filters : [])],
      order_by: 'due_date',
    })
    return res.data || []
  }

  async function getBill(name) {
    const res = await getDoc(DOCTYPE_BILL, name)
    return res.data
  }

  async function createBill(data) {
    return createDoc(DOCTYPE_BILL, data)
  }

  async function updateBill(name, data) {
    return updateDoc(DOCTYPE_BILL, name, data)
  }

  async function deleteBill(name) {
    return deleteDoc(DOCTYPE_BILL, name)
  }

  async function markBillPaid(name, paidAmount) {
    return updateDoc(DOCTYPE_BILL, name, {
      status: 'پرداخت‌شده',
      paid_date: new Date().toISOString().split('T')[0],
      paid_amount: paidAmount,
    })
  }

  // ── Subscriptions ─────────────────────────────────────────────
  async function getSubscriptions() {
    const res = await getList(DOCTYPE_SUBSCRIPTION, {
      fields: ['name', 'subscription_name', 'amount', 'billing_cycle', 'next_billing_date', 'category', 'account', 'status', 'icon'],

      order_by: 'next_billing_date',
    })
    return res.data || []
  }

  async function getSubscription(name) {
    const res = await getDoc(DOCTYPE_SUBSCRIPTION, name)
    return res.data
  }

  async function createSubscription(data) {
    return createDoc(DOCTYPE_SUBSCRIPTION, data)
  }

  async function updateSubscription(name, data) {
    return updateDoc(DOCTYPE_SUBSCRIPTION, name, data)
  }

  async function deleteSubscription(name) {
    return deleteDoc(DOCTYPE_SUBSCRIPTION, name)
  }

  // ── Recurrence Rules ──────────────────────────────────────────
  async function getRecurrenceRules() {
    const res = await getList(DOCTYPE_RECURRENCE, {
      fields: ['name', 'title', 'frequency', 'interval'],

    })
    return res.data || []
  }

  // ── Currencies ────────────────────────────────────────────────
  async function getCurrencies() {
    const res = await getList(DOCTYPE_CURRENCY, {
      fields: ['name', 'symbol'],
    })
    return res.data || []
  }

  // ── Dashboard ─────────────────────────────────────────────────
  async function getDashboard() {
    const [accounts, budgets, bills, savings, transactions] = await Promise.all([
      getAccounts(),
      getBudgets(),
      getBills(),
      getSavingsGoals(),
      getTransactions(),
    ])

    const totalBalance = accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0)
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.transaction_date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const income = thisMonth.filter(t => t.transaction_type === 'درآمد').reduce((s, t) => s + t.amount, 0)
    const expense = thisMonth.filter(t => t.transaction_type === 'هزینه').reduce((s, t) => s + t.amount, 0)
    const activeBudgets = budgets.filter(b => b.status === 'فعال')
    const upcomingBills = bills.filter(b => b.status === 'پیش‌رو' || b.status === 'عقب‌افتاده').slice(0, 5)
    const activeGoals = savings.filter(s => s.status === 'فعال')

    return {
      totalBalance,
      income,
      expense,
      savings: income - expense,
      accounts: accounts.slice(0, 5),
      budgets: activeBudgets.slice(0, 3),
      upcomingBills,
      goals: activeGoals.slice(0, 3),
    }
  }

  return {
    getAccounts, getAccount, createAccount, updateAccount, deleteAccount,
    getCategories, getCategory, createCategory, updateCategory, deleteCategory,
    getTransactions, getTransaction, createTransaction, updateTransaction, deleteTransaction,
    getBudgets, getBudget, createBudget, updateBudget, deleteBudget,
    getSavingsGoals, getSavingsGoal, createSavingsGoal, updateSavingsGoal, deleteSavingsGoal, contributeToGoal,
    getBills, getBill, createBill, updateBill, deleteBill, markBillPaid,
    getSubscriptions, getSubscription, createSubscription, updateSubscription, deleteSubscription,
    getRecurrenceRules,
    getCurrencies,
    getDashboard,
  }
}
