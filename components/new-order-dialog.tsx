"use client"

import { useState, useMemo } from "react"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ArrowLeft,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  DollarSign,
  ImageIcon,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { 
  getStudentsWithBalance,
  getExpeditionsStore,
  createExpeditionTransaction,
  updateExpeditionsStoreItem
} from "@/lib/xano"

interface NewOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expeditionId: number
}

interface StudentWithBalance {
  id: number
  isArchived: boolean
  firstName: string
  lastName: string
  crew_name?: string
  profileImage?: string
  checking_account_total: number
}

interface StoreItem {
  id: number
  product_name: string
  quantity: number
  description: string
  isArchived: boolean
  product_image: string
  price: number
}

interface CartItem {
  storeItem: StoreItem
  quantity: number
}

export function NewOrderDialog({ open, onOpenChange, expeditionId }: NewOrderDialogProps) {
  const [step, setStep] = useState<"select-student" | "select-items" | "complete">("select-student")
  const [selectedStudent, setSelectedStudent] = useState<StudentWithBalance | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch students with balance from the API - only when dialog is open
  const { data: allStudents, isLoading: studentsLoading } = useSWR(
    open && expeditionId ? `students_with_balance_${expeditionId}` : null,
    () => getStudentsWithBalance(expeditionId),
    { revalidateOnFocus: false }
  )

  // Fetch store items - only when dialog is open
  const { data: storeItems, isLoading: storeLoading } = useSWR(
    open && expeditionId ? `expeditions_store_${expeditionId}` : null,
    () => getExpeditionsStore(expeditionId),
    { revalidateOnFocus: false }
  )

  // Filter students by search (API already filters by expedition)
  const filteredStudents = useMemo(() => {
    if (!allStudents) return []
    
    return allStudents
      .filter((s: any) => {
        // Filter by archived status
        if (s.isArchived) return false
        
        // Filter by search
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase()
          return fullName.includes(query)
        }
        return true
      })
      .map((s: any) => ({
        id: s.id,
        isArchived: s.isArchived || false,
        firstName: s.firstName || "",
        lastName: s.lastName || "",
        crew_name: s.crew_name || "",
        profileImage: s.profileImage || "",
        checking_account_total: s.checking_account_total || 0
      }))
      .sort((a: StudentWithBalance, b: StudentWithBalance) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase()
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase()
        return nameA.localeCompare(nameB)
      })
  }, [allStudents, searchQuery])

  // Filter available store items (not archived, in stock)
  const availableItems = useMemo(() => {
    if (!storeItems) return []
    return (storeItems as StoreItem[])
      .filter((item) => !item.isArchived && item.quantity > 0)
      .sort((a, b) => a.product_name.localeCompare(b.product_name))
  }, [storeItems])

  // Calculate cart total
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.storeItem.price * item.quantity), 0)
  }, [cart])

  // Calculate remaining balance after order
  const remainingBalance = useMemo(() => {
    if (!selectedStudent) return 0
    return selectedStudent.checking_account_total - cartTotal
  }, [selectedStudent, cartTotal])

  // Check if student can afford an item
  const canAffordItem = (item: StoreItem) => {
    if (!selectedStudent) return false
    return remainingBalance >= item.price
  }

  // Get quantity of item in cart
  const getCartQuantity = (itemId: number) => {
    const cartItem = cart.find(c => c.storeItem.id === itemId)
    return cartItem?.quantity || 0
  }

  // Add item to cart
  const addToCart = (item: StoreItem) => {
    const existingIndex = cart.findIndex(c => c.storeItem.id === item.id)
    if (existingIndex >= 0) {
      const newCart = [...cart]
      newCart[existingIndex].quantity += 1
      setCart(newCart)
    } else {
      setCart([...cart, { storeItem: item, quantity: 1 }])
    }
  }

  // Remove item from cart
  const removeFromCart = (itemId: number) => {
    const existingIndex = cart.findIndex(c => c.storeItem.id === itemId)
    if (existingIndex >= 0) {
      const newCart = [...cart]
      if (newCart[existingIndex].quantity > 1) {
        newCart[existingIndex].quantity -= 1
        setCart(newCart)
      } else {
        newCart.splice(existingIndex, 1)
        setCart(newCart)
      }
    }
  }

  // Handle student selection
  const handleSelectStudent = (student: StudentWithBalance) => {
    setSelectedStudent(student)
    setCart([])
    setStep("select-items")
  }

  // Handle back button
  const handleBack = () => {
    if (step === "select-items") {
      setStep("select-student")
      setSelectedStudent(null)
      setCart([])
    }
  }

  // Handle submit order
  const handleSubmitOrder = async () => {
    if (!selectedStudent || cart.length === 0) return

    setIsSubmitting(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      // Create a transaction for each cart item
      for (const cartItem of cart) {
        // Create one transaction per quantity
        for (let i = 0; i < cartItem.quantity; i++) {
          await createExpeditionTransaction({
            date: today,
            transaction: "Purchase",
            amount: -Math.abs(cartItem.storeItem.price), // Negative value
            students_id: selectedStudent.id,
            expeditions_id: expeditionId,
            expeditions_store_id: cartItem.storeItem.id,
            quantity: 1
          })
        }

        // Update the store item quantity
        const newQuantity = Math.max(0, cartItem.storeItem.quantity - cartItem.quantity)
        await updateExpeditionsStoreItem(cartItem.storeItem.id, {
          quantity: newQuantity
        })
      }

      // Refresh data
      mutate(`students_with_balance_${expeditionId}`)
      mutate(`expedition_transactions_${expeditionId}`)
      mutate(`expeditions_store_${expeditionId}`)

      setStep("complete")
      toast.success("Order submitted successfully!")
    } catch (error) {
      console.error("Error submitting order:", error)
      toast.error("Failed to submit order")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle close/reset
  const handleClose = () => {
    onOpenChange(false)
    // Reset after animation
    setTimeout(() => {
      setStep("select-student")
      setSelectedStudent(null)
      setCart([])
      setSearchQuery("")
    }, 200)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-32px)] sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col [&>button]:cursor-pointer p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {step === "select-items" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer flex-shrink-0"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base sm:text-lg">
                {step === "select-student" && "New Order"}
                {step === "select-items" && "Select Items"}
                {step === "complete" && "Order Complete"}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {step === "select-student" && "Select a student to create an order"}
                {step === "select-items" && selectedStudent && (
                  <span className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <span className="truncate">{selectedStudent.firstName} {selectedStudent.lastName}</span>
                    <Badge variant="outline" className="text-xs">
                      {formatPrice(selectedStudent.checking_account_total)}
                    </Badge>
                  </span>
                )}
                {step === "complete" && "The order has been processed successfully"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: Select Student */}
        {step === "select-student" && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative mb-3 sm:mb-4 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Student List Table */}
            <div className="flex-1 min-h-0 overflow-auto -mx-4 sm:-mx-6">
              {studentsLoading ? (
                <div className="px-4 sm:px-6 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </div>
                  ))}
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground px-4 sm:px-6">
                  <p className="text-sm">No students found</p>
                  <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600">Student</TableHead>
                      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden sm:table-cell">Crew</TableHead>
                      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student: StudentWithBalance) => (
                      <TableRow 
                        key={student.id}
                        onClick={() => handleSelectStudent(student)}
                        className="cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                      >
                        <TableCell className="h-14 px-4 sm:px-6">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              {student.profileImage ? (
                                <AvatarImage src={student.profileImage} alt={`${student.firstName} ${student.lastName}`} />
                              ) : null}
                              <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                                {student.firstName?.[0]}{student.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate text-sm">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-xs text-gray-500 truncate sm:hidden">{student.crew_name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="h-14 px-4 sm:px-6 hidden sm:table-cell">
                          <span className="text-sm text-gray-600">{student.crew_name}</span>
                        </TableCell>
                        <TableCell className="h-14 px-4 sm:px-6 text-right">
                          <Badge 
                            variant={student.checking_account_total >= 0 ? "outline" : "destructive"}
                            className={`text-xs ${student.checking_account_total >= 0 ? "bg-green-50 text-green-700 border-green-200" : ""}`}
                          >
                            {formatPrice(student.checking_account_total)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select Items */}
        {step === "select-items" && selectedStudent && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {/* Balance & Cart Summary */}
            <div className="flex items-center justify-between mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-lg bg-gray-50 flex-shrink-0">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-500">Remaining</p>
                <p className={`text-base sm:text-lg font-bold ${remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPrice(remainingBalance)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] sm:text-xs text-gray-500">Cart Total</p>
                <p className="text-base sm:text-lg font-bold text-gray-900">
                  {formatPrice(cartTotal)}
                </p>
              </div>
            </div>

            {/* Items Table */}
            <div className="flex-1 min-h-0 overflow-auto -mx-4 sm:-mx-6">
              {storeLoading ? (
                <div className="px-4 sm:px-6 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-10 w-10 rounded" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </div>
                  ))}
                </div>
              ) : availableItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground px-4 sm:px-6">
                  <ShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No items available for purchase</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600">Item</TableHead>
                      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-right">Price</TableHead>
                      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-32">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableItems.map((item: StoreItem) => {
                      const cartQty = getCartQuantity(item.id)
                      const canAfford = canAffordItem(item)
                      const isInCart = cartQty > 0
                      const isDisabled = !canAfford && !isInCart

                      return (
                        <TableRow 
                          key={item.id}
                          className={`${isDisabled ? 'opacity-50 bg-gray-50' : ''} ${isInCart ? 'bg-blue-50/50' : ''}`}
                        >
                          <TableCell className="h-14 px-4 sm:px-6">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                {item.product_image ? (
                                  <img
                                    src={item.product_image}
                                    alt={item.product_name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <ImageIcon className="h-4 w-4 text-gray-300" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate text-sm">
                                  {item.product_name}
                                </p>
                                {isDisabled && !isInCart && (
                                  <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Insufficient balance
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="h-14 px-4 sm:px-6 text-right">
                            <span className="font-bold text-gray-900 text-sm">
                              {formatPrice(item.price)}
                            </span>
                          </TableCell>
                          <TableCell className="h-14 px-4 sm:px-6">
                            <div className="flex items-center justify-center gap-1">
                              {isInCart ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 cursor-pointer"
                                    onClick={() => removeFromCart(item.id)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center font-medium text-sm">
                                    {cartQty}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 cursor-pointer"
                                    onClick={() => addToCart(item)}
                                    disabled={!canAfford}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="cursor-pointer h-7 text-xs"
                                  onClick={() => addToCart(item)}
                                  disabled={isDisabled}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Cart Summary Footer */}
            {cart.length > 0 && (
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t flex-shrink-0">
                <div className="space-y-0.5 sm:space-y-1 mb-2 sm:mb-3 max-h-20 overflow-y-auto">
                  {cart.map((cartItem) => (
                    <div key={cartItem.storeItem.id} className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600 truncate mr-2">
                        {cartItem.storeItem.product_name} x{cartItem.quantity}
                      </span>
                      <span className="font-medium flex-shrink-0">
                        {formatPrice(cartItem.storeItem.price * cartItem.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between font-bold text-base sm:text-lg border-t pt-2">
                  <span>Total</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Complete */}
        {step === "complete" && (
          <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-8">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-green-100 flex items-center justify-center mb-3 sm:mb-4">
              <CheckCircle className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Order Submitted!</h3>
            <p className="text-xs sm:text-sm text-gray-500 text-center max-w-xs px-4">
              {cart.reduce((sum, c) => sum + c.quantity, 0)} item(s) totaling {formatPrice(cartTotal)} have been deducted from {selectedStudent?.firstName}'s account.
            </p>
          </div>
        )}

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          {step === "select-student" && (
            <Button variant="outline" onClick={handleClose} className="cursor-pointer w-full sm:w-auto">
              Cancel
            </Button>
          )}
          {step === "select-items" && (
            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleClose} className="cursor-pointer w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                onClick={handleSubmitOrder}
                disabled={cart.length === 0 || isSubmitting}
                className="cursor-pointer w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    <span className="truncate">Submit ({formatPrice(cartTotal)})</span>
                  </>
                )}
              </Button>
            </div>
          )}
          {step === "complete" && (
            <Button onClick={handleClose} className="cursor-pointer w-full sm:w-auto">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
