"use client"

import { use, useState, useMemo, useEffect } from "react"
import useSWR, { mutate } from "swr"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { ExpeditionHeader } from "@/components/expedition-header"
import { 
  Search,
  Receipt,
  ShoppingCart,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  Users,
  Copy,
  QrCode,
  MoreHorizontal
} from "lucide-react"
import React from "react"
import { 
  getExpeditionTransactions,
  getExpeditionsStore,
  updateExpeditionTransaction,
  deleteExpeditionTransaction,
  updateExpeditionsStoreItem,
  getStudentsWithBalance
} from "@/lib/xano"
import { useExpeditions, useStudentsByExpedition } from "@/lib/hooks/use-expeditions"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { NewOrderDialog } from "@/components/new-order-dialog"

interface PageProps {
  params: Promise<{ id: string }>
}

interface ExpeditionTransaction {
  id: number
  created_at: number
  date: string
  transaction: string
  amount: number
  students_id: number
  expeditions_id: number
  expeditions_store_id: number
  quantity: number
}

interface Order {
  id: string // Composite key for the order
  created_at: number
  date: string
  students_id: number
  transactions: ExpeditionTransaction[]
  totalAmount: number
  totalItems: number
}

export default function StoreTransactionsPage({ params }: PageProps) {
  const { id } = use(params)
  const expeditionId = parseInt(id)

  const [searchQuery, setSearchQuery] = useState("")
  const [newOrderDialogOpen, setNewOrderDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteOrderDialogOpen, setDeleteOrderDialogOpen] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<ExpeditionTransaction | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [balancesExpanded, setBalancesExpanded] = useState(false)
  const [editFormData, setEditFormData] = useState({
    amount: 0,
    quantity: 1
  })

  // Set balancesExpanded based on screen size on mount
  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 640px)').matches
    setBalancesExpanded(isDesktop)
  }, [])

  // Get the public store URL
  const publicStoreUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/public/store/${expeditionId}`
    : `/public/store/${expeditionId}`

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicStoreUrl)
      toast.success("Store URL copied to clipboard")
    } catch {
      toast.error("Failed to copy URL")
    }
  }

  const { currentUser } = useCurrentUser()
  const isAdmin = currentUser?.role === "Admin"

  const { data: allExpeditions, isLoading: expeditionsLoading } = useExpeditions()
  const expedition = allExpeditions?.find((e: any) => e.id === expeditionId)

  // Get all transactions for this expedition
  const { data: allTransactions, isLoading: transactionsLoading } = useSWR(
    expeditionId ? `expedition_transactions_${expeditionId}` : null,
    () => getExpeditionTransactions(expeditionId)
  )

  // Get store items to look up product names
  const { data: storeItems } = useSWR(
    "expeditions_store",
    () => getExpeditionsStore()
  )

  // Get students to look up names
  const { data: students } = useStudentsByExpedition(expeditionId)

  // Get students with balance
  const { data: studentsWithBalance, isLoading: balancesLoading } = useSWR(
    expeditionId ? `students_with_balance_${expeditionId}` : null,
    () => getStudentsWithBalance(expeditionId)
  )

  // Sort students by balance (largest to smallest) for the balance table
  const sortedStudentsWithBalance = useMemo(() => {
    if (!studentsWithBalance) return []
    return [...studentsWithBalance]
      .filter((s: any) => !s.isArchived)
      .sort((a: any, b: any) => {
        return (b.checking_account_total || 0) - (a.checking_account_total || 0)
      })
  }, [studentsWithBalance])

  // Filter to only show "Purchase" transactions
  const purchaseTransactions = (allTransactions || []).filter(
    (t: ExpeditionTransaction) => t.transaction === "Purchase"
  )

  const isLoading = expeditionsLoading || transactionsLoading

  // Helper to get student info
  const getStudentInfo = (studentId: number) => {
    return students?.find((s: any) => s.id === studentId)
  }

  // Helper to get store item info
  const getStoreItemInfo = (storeItemId: number) => {
    return storeItems?.find((item: any) => item.id === storeItemId)
  }

  // Group transactions into orders (by student + date + created_at within 10 seconds)
  const groupedOrders = useMemo(() => {
    if (!purchaseTransactions.length) return []
    
    const orderMap = new Map<string, Order>()
    const TIME_WINDOW = 10000 // 10 seconds in milliseconds
    
    // Sort by created_at first
    const sorted = [...purchaseTransactions].sort((a, b) => a.created_at - b.created_at)
    
    sorted.forEach((t: ExpeditionTransaction) => {
      // Find an existing order for this student on the same date within the time window
      let foundOrder: Order | null = null
      
      orderMap.forEach((order) => {
        if (
          order.students_id === t.students_id &&
          order.date === t.date && // Same date
          Math.abs(t.created_at - order.created_at) < TIME_WINDOW
        ) {
          foundOrder = order
        }
      })
      
      if (foundOrder) {
        foundOrder.transactions.push(t)
        foundOrder.totalAmount += Math.abs(t.amount)
        foundOrder.totalItems += t.quantity || 1
      } else {
        // Create a new order
        const orderId = `${t.students_id}_${t.date}_${t.created_at}`
        orderMap.set(orderId, {
          id: orderId,
          created_at: t.created_at,
          date: t.date,
          students_id: t.students_id,
          transactions: [t],
          totalAmount: Math.abs(t.amount),
          totalItems: t.quantity || 1
        })
      }
    })
    
    return Array.from(orderMap.values())
  }, [purchaseTransactions])

  // Filter orders based on search
  const filteredOrders = groupedOrders.filter((order: Order) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const student = getStudentInfo(order.students_id)
    const studentName = `${student?.firstName || ""} ${student?.lastName || ""}`.toLowerCase()
    
    // Also search in product names within the order
    const productNames = order.transactions
      .map((t) => getStoreItemInfo(t.expeditions_store_id)?.product_name || "")
      .join(" ")
      .toLowerCase()
    
    return studentName.includes(query) || productNames.includes(query)
  })

  // Sort by date (newest first)
  const sortedOrders = [...filteredOrders].sort((a, b) => b.created_at - a.created_at)
  
  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  // Calculate stats
  const totalRevenue = groupedOrders.reduce((sum: number, o: Order) => sum + o.totalAmount, 0)
  const totalOrders = groupedOrders.length
  const totalItemsSold = groupedOrders.reduce((sum: number, o: Order) => sum + o.totalItems, 0)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const formatDate = (dateStr: string | number) => {
    try {
      if (typeof dateStr === 'number') {
        return format(new Date(dateStr), "MMM d, yyyy h:mm a")
      }
      return format(new Date(dateStr), "MMM d, yyyy h:mm a")
    } catch {
      return String(dateStr)
    }
  }

  const handleEditClick = (transaction: ExpeditionTransaction) => {
    setSelectedTransaction(transaction)
    setEditFormData({
      amount: Math.abs(transaction.amount),
      quantity: transaction.quantity || 1
    })
    setEditDialogOpen(true)
  }

  const handleDeleteClick = (transaction: ExpeditionTransaction) => {
    setSelectedTransaction(transaction)
    setDeleteDialogOpen(true)
  }

  const handleEditSubmit = async () => {
    if (!selectedTransaction) return
    
    setIsSubmitting(true)
    try {
      await updateExpeditionTransaction(selectedTransaction.id, {
        amount: -Math.abs(editFormData.amount), // Keep as negative for purchases
        quantity: editFormData.quantity
      })
      mutate(`expedition_transactions_${expeditionId}`)
      mutate(`students_with_balance_${expeditionId}`)
      setEditDialogOpen(false)
      toast.success("Transaction updated successfully")
    } catch (error) {
      console.error("Error updating transaction:", error)
      toast.error("Failed to update transaction")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedTransaction) return
    
    setIsSubmitting(true)
    try {
      await deleteExpeditionTransaction(selectedTransaction.id)
      
      // Restore the store item quantity
      if (selectedTransaction.expeditions_store_id > 0) {
        const storeItem = storeItems?.find((item: any) => item.id === selectedTransaction.expeditions_store_id)
        if (storeItem) {
          const restoredQuantity = (storeItem.quantity || 0) + (selectedTransaction.quantity || 1)
          await updateExpeditionsStoreItem(selectedTransaction.expeditions_store_id, {
            quantity: restoredQuantity
          })
        }
      }
      
      mutate(`expedition_transactions_${expeditionId}`)
      mutate(`students_with_balance_${expeditionId}`)
      mutate("expeditions_store")
      setDeleteDialogOpen(false)
      toast.success("Transaction deleted successfully")
    } catch (error) {
      console.error("Error deleting transaction:", error)
      toast.error("Failed to delete transaction")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteOrderClick = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedOrder(order)
    setDeleteOrderDialogOpen(true)
  }

  const handleDeleteOrderConfirm = async () => {
    if (!selectedOrder) return
    
    setIsSubmitting(true)
    try {
      // Delete all transactions in the order
      await Promise.all(
        selectedOrder.transactions.map((t) => deleteExpeditionTransaction(t.id))
      )
      
      // Restore store item quantities
      // Group transactions by store item to calculate total quantity to restore
      const quantityByStoreItem: Record<number, number> = {}
      for (const t of selectedOrder.transactions) {
        if (t.expeditions_store_id > 0) {
          quantityByStoreItem[t.expeditions_store_id] = 
            (quantityByStoreItem[t.expeditions_store_id] || 0) + (t.quantity || 1)
        }
      }
      
      // Update each store item's quantity
      await Promise.all(
        Object.entries(quantityByStoreItem).map(async ([storeItemId, quantityToRestore]) => {
          const storeItem = storeItems?.find((item: any) => item.id === Number(storeItemId))
          if (storeItem) {
            const restoredQuantity = (storeItem.quantity || 0) + quantityToRestore
            await updateExpeditionsStoreItem(Number(storeItemId), {
              quantity: restoredQuantity
            })
          }
        })
      )
      
      mutate(`expedition_transactions_${expeditionId}`)
      mutate(`students_with_balance_${expeditionId}`)
      mutate("expeditions_store")
      setDeleteOrderDialogOpen(false)
      toast.success(`Order with ${selectedOrder.transactions.length} item(s) deleted successfully`)
    } catch (error) {
      console.error("Error deleting order:", error)
      toast.error("Failed to delete order")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Expedition Header with Navigation */}
      <ExpeditionHeader expedition={expedition} isLoading={expeditionsLoading} currentPage="transactions" />

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards - Hidden on mobile */}
        <div className="hidden sm:grid grid-cols-2 gap-4 mb-6">
          <Card className="py-4">
            <CardHeader className="px-4 py-0 pb-0 gap-0">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-0 pt-1">
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
              )}
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardHeader className="px-4 py-0 pb-0 gap-0">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Items Sold
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-0 pt-1">
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{totalItemsSold}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Balances Table - Collapsible */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => setBalancesExpanded(!balancesExpanded)}
                className="w-full px-4 sm:px-6 py-4 border-b bg-gray-50/50 flex items-center justify-between cursor-pointer hover:bg-gray-100/50 transition-colors"
              >
                <div className="text-left">
                  <h2 className="text-lg font-semibold">Account Balances</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {sortedStudentsWithBalance.length} students
                  </p>
                </div>
                {balancesExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              {balancesExpanded && (
                <>
                  {balancesLoading ? (
                    <div className="p-4 space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-12 ml-auto" />
                        </div>
                      ))}
                    </div>
                  ) : sortedStudentsWithBalance.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No students found</p>
                    </div>
                  ) : (
                    <div className="overflow-auto max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/30 hover:bg-gray-50/30">
                            <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 sticky top-0 bg-white">Student</TableHead>
                            <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-right sticky top-0 bg-white">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedStudentsWithBalance.map((student: any) => (
                            <TableRow key={student.id} className="border-b last:border-0">
                              <TableCell className="h-12 px-4">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-7 w-7">
                                    {student.profileImage ? (
                                      <AvatarImage 
                                        src={student.profileImage} 
                                        alt={`${student.firstName} ${student.lastName}`} 
                                      />
                                    ) : null}
                                    <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                                      {student.firstName?.[0]}{student.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium text-gray-900 truncate">
                                    {student.firstName} {student.lastName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="h-12 px-4 text-right">
                                <span className={`text-sm font-medium ${student.checking_account_total >= 0 ? "text-green-600" : "text-red-600"}`}>
                                  {formatPrice(student.checking_account_total || 0)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Orders Table */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b bg-gray-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Transactions</h2>
              <p className="text-sm text-gray-600 mt-1">View all store purchases</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="relative flex-1 sm:w-64 min-w-[150px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 cursor-pointer"
                onClick={() => window.open(`/public/store/${expeditionId}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 cursor-pointer"
                onClick={handleCopyUrl}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 cursor-pointer"
                onClick={() => setQrDialogOpen(true)}
              >
                <QrCode className="h-4 w-4" />
              </Button>
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => setNewOrderDialogOpen(true)}
                  className="cursor-pointer whitespace-nowrap"
                >
                  <ShoppingCart className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">New Order</span>
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                    <TableHead className="h-10 w-10 px-4 sm:px-6"></TableHead>
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600">Date</TableHead>
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600">Student</TableHead>
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center">Items</TableHead>
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="h-16 px-4 sm:px-6 w-10"><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                      <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">
                {searchQuery ? "No matching orders" : "No orders yet"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery 
                  ? "Try adjusting your search query" 
                  : "Orders will appear here when purchases are made"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600">Date</TableHead>
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600">Student</TableHead>
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center">Items</TableHead>
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-right">Total</TableHead>
                    {isAdmin && (
                      <TableHead className="h-10 w-12 px-4 sm:px-6"></TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.map((order: Order) => {
                    const student = getStudentInfo(order.students_id)
                    const isExpanded = expandedOrders.has(order.id)
                    
                    return (
                      <React.Fragment key={order.id}>
                        {/* Order Row */}
                        <TableRow 
                          className="border-b hover:bg-gray-50/50 cursor-pointer"
                          onClick={() => toggleOrderExpanded(order.id)}
                        >
                          <TableCell className="h-14 px-4 sm:px-6">
                            <span className="text-sm text-gray-600 whitespace-nowrap">
                              {formatDate(order.date || order.created_at)}
                            </span>
                          </TableCell>
                          <TableCell className="h-14 px-4 sm:px-6">
                            {student ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  {student.profileImage ? (
                                    <AvatarImage 
                                      src={student.profileImage} 
                                      alt={`${student.firstName} ${student.lastName}`} 
                                    />
                                  ) : null}
                                  <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                                    {student.firstName?.[0]}{student.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-gray-900 whitespace-nowrap">
                                  {student.firstName} {student.lastName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Student #{order.students_id}</span>
                            )}
                          </TableCell>
                          <TableCell className="h-14 px-4 sm:px-6 text-center">
                            <Badge variant="outline" className="bg-white">
                              {order.totalItems} {order.totalItems === 1 ? 'item' : 'items'}
                            </Badge>
                          </TableCell>
                          <TableCell className="h-14 px-4 sm:px-6 text-right">
                            <span className="font-bold text-gray-900">
                              {formatPrice(order.totalAmount)}
                            </span>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="h-14 px-4 sm:px-6 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger 
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                                    onClick={(e) => handleDeleteOrderClick(order, e)}
                                  >
                                    Delete Order
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                        
                        {/* Expanded Items */}
                        {isExpanded && order.transactions.map((transaction: ExpeditionTransaction) => {
                          const storeItem = getStoreItemInfo(transaction.expeditions_store_id)
                          return (
                            <TableRow 
                              key={`item-${transaction.id}`}
                              className="bg-gray-50/70 border-b last:border-0"
                            >
                              <TableCell className="h-12 px-4 sm:px-6" colSpan={2}>
                                <div className="flex items-center gap-3 pl-4">
                                  <div className="h-8 w-8 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                                    {storeItem?.product_image ? (
                                      <img 
                                        src={storeItem.product_image} 
                                        alt={storeItem.product_name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center">
                                        <ImageIcon className="h-4 w-4 text-gray-300" />
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-700">
                                    {storeItem?.product_name || (transaction.expeditions_store_id > 0 ? `Product #${transaction.expeditions_store_id}` : "Unknown Product")}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    × {transaction.quantity || 1}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="h-12 px-4 sm:px-6 text-center">
                                <span className="text-sm text-gray-600">
                                  {formatPrice(Math.abs(transaction.amount))}
                                </span>
                              </TableCell>
                              <TableCell className="h-12 px-4 sm:px-6 text-right">
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteClick(transaction)
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
            </div>
          </div>
        </div>
      </main>

      {/* New Order Dialog */}
      <NewOrderDialog
        open={newOrderDialogOpen}
        onOpenChange={setNewOrderDialogOpen}
        expeditionId={expeditionId}
      />

      {/* Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[400px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update the transaction amount or quantity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount ($)</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={editFormData.amount}
                onChange={(e) => setEditFormData(prev => ({ 
                  ...prev, 
                  amount: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                type="number"
                min="1"
                value={editFormData.quantity}
                onChange={(e) => setEditFormData(prev => ({ 
                  ...prev, 
                  quantity: parseInt(e.target.value) || 1 
                }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner className="h-4 w-4" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This will refund {formatPrice(Math.abs(selectedTransaction?.amount || 0))} to the student&apos;s account. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner className="h-4 w-4" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Order Confirmation Dialog */}
      <Dialog open={deleteOrderDialogOpen} onOpenChange={setDeleteOrderDialogOpen}>
        <DialogContent className="sm:max-w-[400px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this entire order? This will delete {selectedOrder?.transactions.length || 0} item(s) and refund {formatPrice(selectedOrder?.totalAmount || 0)} to the student&apos;s account. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOrderDialogOpen(false)}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrderConfirm}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner className="h-4 w-4" /> : "Delete Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-[320px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>Store QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <div className="bg-white p-4 rounded-lg border">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicStoreUrl)}`}
                alt="Store QR Code"
                className="w-48 h-48"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setQrDialogOpen(false)}
              className="cursor-pointer w-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
