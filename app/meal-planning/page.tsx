"use client"

import { useMemo, useState } from "react"
import useSWR, { mutate } from "swr"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, Pencil, X, FileUp } from "lucide-react"
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "@/components/ui/file-upload"
import { cn, getPhotoUrl } from "@/lib/utils"
import { getGalleyEquipment } from "@/lib/xano"

const XANO_BASE_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y"

interface Recipe {
  id: number
  created_at: number
  recipe_name: string
  recipe_photo: any
  type: string
  types?: string[]
  summary?: string
  duration_minutes?: string
  expeditions_id?: number[]
  instructions?: any[]
}

async function uploadImageToXano(file: File): Promise<any> {
  const formData = new FormData()
  formData.append("content", file)
  const response = await fetch(`${XANO_BASE_URL}/upload/image`, {
    method: "POST",
    body: formData,
  })
  if (!response.ok) throw new Error("Failed to upload image")
  return response.json()
}

const truncateText = (text: string, maxLength: number) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + "..."
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function MealPlanningPage() {
  const router = useRouter()
  const [assignSheetOpen, setAssignSheetOpen] = useState(false)
  const [selectedExpeditionForAssign, setSelectedExpeditionForAssign] = useState<number | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)

  // Add recipe sheet state
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    recipe_name: "",
    recipe_photo: null as any,
    types: [] as string[],
    summary: "",
    duration_minutes: "",
    expeditions_id: [] as number[],
  })
  const [addPhotoFile, setAddPhotoFile] = useState<File | null>(null)
  const [addPhotoPreview, setAddPhotoPreview] = useState<string | null>(null)
  const [isUploadingAddPhoto, setIsUploadingAddPhoto] = useState(false)
  const [isSavingAdd, setIsSavingAdd] = useState(false)

  // Edit sheet state
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null)
  const [editForm, setEditForm] = useState({
    recipe_name: "",
    recipe_photo: null as any,
    types: [] as string[],
    summary: "",
    duration_minutes: "",
    expeditions_id: [] as number[],
  })
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  
  const { data: recipes, isLoading, error } = useSWR<Recipe[]>(
    `${XANO_BASE_URL}/expedition_cookbook`,
    fetcher
  )

  const { data: expeditions } = useSWR<any[]>(
    `${XANO_BASE_URL}/expeditions`,
    fetcher
  )

  // Galley equipment
  const { data: galleyEquipment = [] } = useSWR("galley_equipment", getGalleyEquipment)

  // Fetch recipe details (with instructions) for equipment display
  const recipeIds = useMemo(() => (recipes || []).map(r => r.id), [recipes])
  const { data: recipeDetails } = useSWR(
    recipeIds.length > 0 ? `recipe_details_${recipeIds.join(",")}` : null,
    async () => {
      const details = await Promise.all(
        recipeIds.map(id => fetch(`${XANO_BASE_URL}/expedition_cookbook/${id}`).then(r => r.json()))
      )
      const map: Record<number, any> = {}
      details.forEach(d => { if (d.id) map[d.id] = d })
      return map
    }
  )

  const getRecipeEquipment = (recipeId: number): string[] => {
    const detail = recipeDetails?.[recipeId]
    if (!detail?.instructions) return []
    const ids = new Set<number>()
    detail.instructions.forEach((inst: any) => {
      if (Array.isArray(inst.expedition_galley_equipment_id)) {
        inst.expedition_galley_equipment_id.forEach((id: number) => ids.add(id))
      }
    })
    return [...ids].map(id => galleyEquipment.find((e: any) => e.id === id)?.name).filter(Boolean).sort()
  }

  // Group recipes by types array (a recipe can appear in multiple groups)
  const groupedRecipes = useMemo(() => {
    if (!recipes) return { Breakfast: [], Lunch: [], Dinner: [], Snack: [] }

    const groups: Record<string, Recipe[]> = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
      Snack: [],
    }

    recipes.forEach((recipe) => {
      const recipeTypes = Array.isArray(recipe.types) && recipe.types.length > 0
        ? recipe.types
        : recipe.type ? [recipe.type] : []
      recipeTypes.forEach((t) => {
        if (groups[t]) groups[t].push(recipe)
      })
    })

    // Sort each group alphabetically by name
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => a.recipe_name.localeCompare(b.recipe_name))
    })

    return groups
  }, [recipes])

  const handleRowClick = (id: number) => {
    router.push(`/meal-planning/${id}`)
  }

  const handleEditClick = (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation()
    setEditRecipe(recipe)
    setEditForm({
      recipe_name: recipe.recipe_name || "",
      recipe_photo: recipe.recipe_photo || null,
      types: Array.isArray(recipe.types) && recipe.types.length > 0 ? recipe.types : recipe.type ? [recipe.type] : [],
      summary: recipe.summary || "",
      duration_minutes: recipe.duration_minutes || "",
      expeditions_id: recipe.expeditions_id || [],
    })
    setEditPhotoFile(null)
    setEditPhotoPreview(getPhotoUrl(recipe.recipe_photo))
    setEditSheetOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editRecipe) return

    setIsSavingEdit(true)
    try {
      let photoData = editForm.recipe_photo
      if (editPhotoFile) {
        setIsUploadingEditPhoto(true)
        photoData = await uploadImageToXano(editPhotoFile)
        setIsUploadingEditPhoto(false)
      }

      const response = await fetch(`${XANO_BASE_URL}/expedition_cookbook/${editRecipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expedition_cookbook_id: editRecipe.id,
          recipe_name: editForm.recipe_name,
          recipe_photo: photoData,
          types: editForm.types,
          summary: editForm.summary,
          duration_minutes: editForm.duration_minutes,
          expeditions_id: editForm.expeditions_id,
        }),
      })

      if (!response.ok) throw new Error("Failed to update recipe")

      toast.success("Recipe updated successfully")
      setEditSheetOpen(false)
      setEditRecipe(null)
      setEditPhotoFile(null)
      setEditPhotoPreview(null)
      mutate(`${XANO_BASE_URL}/expedition_cookbook`)
    } catch (error) {
      console.error("Error updating recipe:", error)
      toast.error("Failed to update recipe")
    } finally {
      setIsSavingEdit(false)
      setIsUploadingEditPhoto(false)
    }
  }

  const handleEditExpeditionToggle = (expeditionId: number) => {
    setEditForm(prev => ({
      ...prev,
      expeditions_id: prev.expeditions_id.includes(expeditionId)
        ? prev.expeditions_id.filter(id => id !== expeditionId)
        : [...prev.expeditions_id, expeditionId],
    }))
  }

  const handleSaveAdd = async () => {
    if (!addForm.recipe_name.trim() || addForm.types.length === 0) return

    setIsSavingAdd(true)
    try {
      let photoData = addForm.recipe_photo
      if (addPhotoFile) {
        setIsUploadingAddPhoto(true)
        photoData = await uploadImageToXano(addPhotoFile)
        setIsUploadingAddPhoto(false)
      }

      const response = await fetch(`${XANO_BASE_URL}/expedition_cookbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe_name: addForm.recipe_name,
          recipe_photo: photoData,
          types: addForm.types,
          summary: addForm.summary,
          duration_minutes: addForm.duration_minutes,
          expeditions_id: addForm.expeditions_id,
        }),
      })

      if (!response.ok) throw new Error("Failed to create recipe")

      toast.success("Recipe created successfully")
      setAddSheetOpen(false)
      setAddForm({
        recipe_name: "",
        recipe_photo: null,
        types: [],
        summary: "",
        duration_minutes: "",
        expeditions_id: [],
      })
      setAddPhotoFile(null)
      setAddPhotoPreview(null)
      mutate(`${XANO_BASE_URL}/expedition_cookbook`)
    } catch (error) {
      console.error("Error creating recipe:", error)
      toast.error("Failed to create recipe")
    } finally {
      setIsSavingAdd(false)
      setIsUploadingAddPhoto(false)
    }
  }

  const handleAddExpeditionToggle = (expeditionId: number) => {
    setAddForm(prev => ({
      ...prev,
      expeditions_id: prev.expeditions_id.includes(expeditionId)
        ? prev.expeditions_id.filter(id => id !== expeditionId)
        : [...prev.expeditions_id, expeditionId],
    }))
  }

  const handleAssignAllToExpedition = async () => {
    if (!selectedExpeditionForAssign || !recipes) return

    setIsAssigning(true)
    try {
      // PATCH each recipe to include the selected expedition
      const updates = recipes.map(async (recipe) => {
        const currentIds = recipe.expeditions_id || []
        if (currentIds.includes(selectedExpeditionForAssign)) return // Already assigned

        const response = await fetch(`${XANO_BASE_URL}/expedition_cookbook/${recipe.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expeditions_id: [...currentIds, selectedExpeditionForAssign],
          }),
        })
        if (!response.ok) throw new Error(`Failed to update recipe ${recipe.id}`)
      })

      await Promise.all(updates)

      const expeditionName = expeditions?.find((e: any) => e.id === selectedExpeditionForAssign)?.name || "expedition"
      toast.success(`All recipes assigned to ${expeditionName}`)
      setAssignSheetOpen(false)
      setSelectedExpeditionForAssign(null)
      mutate(`${XANO_BASE_URL}/expedition_cookbook`)
    } catch (error) {
      console.error("Error assigning recipes:", error)
      toast.error("Failed to assign recipes to expedition")
    } finally {
      setIsAssigning(false)
    }
  }

  const renderMealSection = (title: string, meals: Recipe[]) => (
    <Card className="mb-6 pb-0">
      <CardHeader className="pb-4 border-b">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[7%]">Photo</TableHead>
                <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[30%]">Recipe Name</TableHead>
                <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[10%]">Total Time</TableHead>
                <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden lg:table-cell w-[46%]">Equipment</TableHead>
                <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[7%]">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                    No {title.toLowerCase()} recipes found
                  </TableCell>
                </TableRow>
              ) : (
                meals.map((meal) => (
                  <TableRow
                    key={meal.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <TableCell className="h-16 px-4 sm:px-6 cursor-pointer" onClick={() => handleRowClick(meal.id)}>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-gray-100">
                        {getPhotoUrl(meal.recipe_photo) ? (
                          <Image
                            src={getPhotoUrl(meal.recipe_photo)!}
                            alt={meal.recipe_name}
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No img
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="h-16 px-4 sm:px-6 cursor-pointer" onClick={() => handleRowClick(meal.id)}>
                      <span className="font-medium text-gray-900 text-sm truncate block">{meal.recipe_name}</span>
                    </TableCell>
                    <TableCell className="h-16 px-4 sm:px-6 cursor-pointer" onClick={() => handleRowClick(meal.id)}>
                      <span className="text-sm text-gray-600">
                        {meal.duration_minutes && parseInt(meal.duration_minutes) > 0
                          ? (() => {
                              const total = parseInt(meal.duration_minutes)
                              const h = Math.floor(total / 60)
                              const m = total % 60
                              return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
                            })()
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="h-16 px-4 sm:px-6 hidden lg:table-cell cursor-pointer" onClick={() => handleRowClick(meal.id)}>
                      <span className="text-sm text-gray-500 truncate block">
                        {getRecipeEquipment(meal.id).join(", ") || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="h-16 px-4 sm:px-6">
                      <button
                        type="button"
                        onClick={(e) => handleEditClick(e, meal)}
                        className="h-8 w-8 rounded-md border border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

  const renderSkeletonTable = () => (
    <Card className="mb-6">
      <CardHeader className="pb-4 border-b">
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="h-10 px-4 sm:px-6 w-[7%]"><Skeleton className="h-4 w-12" /></TableHead>
                <TableHead className="h-10 px-4 sm:px-6 w-[30%]"><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead className="h-10 px-4 sm:px-6 w-[10%]"><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead className="h-10 px-4 sm:px-6 hidden lg:table-cell w-[46%]"><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead className="h-10 px-4 sm:px-6 w-[7%]"><Skeleton className="h-4 w-8" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg" /></TableCell>
                  <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="h-5 w-32 sm:w-48" /></TableCell>
                  <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="h-5 w-16 sm:w-20" /></TableCell>
                  <TableCell className="h-16 px-4 sm:px-6 hidden lg:table-cell"><Skeleton className="h-5 w-64" /></TableCell>
                  <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="h-8 w-8 rounded" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Meal Planning</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Browse and manage expedition recipes by meal type
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedExpeditionForAssign(null)
              setAssignSheetOpen(true)
            }}
            className="cursor-pointer"
          >
            Assign All
          </Button>
          <Button
            onClick={() => {
              setAddForm({
                recipe_name: "",
                recipe_photo: null,
                types: [],
                summary: "",
                duration_minutes: "",
                expeditions_id: [],
              })
              setAddPhotoFile(null)
              setAddPhotoPreview(null)
              setAddSheetOpen(true)
            }}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Recipe
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">Failed to load recipes. Please try again later.</p>
        </div>
      )}

      {isLoading ? (
        <>
          {renderSkeletonTable()}
          {renderSkeletonTable()}
          {renderSkeletonTable()}
        </>
      ) : (
        <>
          {renderMealSection("Breakfast", groupedRecipes.Breakfast)}
          {renderMealSection("Lunch", groupedRecipes.Lunch)}
          {renderMealSection("Dinner", groupedRecipes.Dinner)}
          {renderMealSection("Snack", groupedRecipes.Snack)}
        </>
      )}

      {/* Add Recipe Sheet */}
      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle>Add Recipe</SheetTitle>
              <button
                type="button"
                onClick={() => setAddSheetOpen(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <SheetDescription>Create a new recipe for the cookbook</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="add-recipe-name" className="text-sm font-medium">Recipe Name *</Label>
              <Input
                id="add-recipe-name"
                value={addForm.recipe_name}
                onChange={(e) => setAddForm({ ...addForm, recipe_name: e.target.value })}
                placeholder="e.g., Chicken Alfredo"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Type *</Label>
              <div className="flex flex-wrap gap-2">
                {["Breakfast", "Lunch", "Dinner", "Snack"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAddForm(f => ({
                      ...f,
                      types: f.types.includes(t) ? f.types.filter(x => x !== t) : [...f.types, t]
                    }))}
                    className={cn(
                      "px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors",
                      addForm.types.includes(t)
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Total Cooking and Prep Time</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={String(Math.floor(parseInt(addForm.duration_minutes) / 60) || 0)}
                  onValueChange={(val) => {
                    const hours = parseInt(val)
                    const currentMins = (parseInt(addForm.duration_minutes) || 0) % 60
                    setAddForm({ ...addForm, duration_minutes: String(hours * 60 + currentMins) })
                  }}
                >
                  <SelectTrigger className="h-11 flex-1 cursor-pointer">
                    <SelectValue placeholder="Hours" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 7 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>{i} {i === 1 ? "hour" : "hours"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String((parseInt(addForm.duration_minutes) || 0) % 60)}
                  onValueChange={(val) => {
                    const mins = parseInt(val)
                    const currentHours = Math.floor((parseInt(addForm.duration_minutes) || 0) / 60)
                    setAddForm({ ...addForm, duration_minutes: String(currentHours * 60 + mins) })
                  }}
                >
                  <SelectTrigger className="h-11 flex-1 cursor-pointer">
                    <SelectValue placeholder="Minutes" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                      <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Recipe Photo</Label>
              <FileUpload
                maxFiles={1}
                maxSize={10 * 1024 * 1024}
                accept="image/*"
                value={addPhotoFile ? [addPhotoFile] : []}
                onValueChange={(files) => {
                  const file = files[0] || null
                  setAddPhotoFile(file)
                  setAddPhotoPreview(file ? URL.createObjectURL(file) : null)
                }}
              >
                <FileUploadDropzone className="flex-row gap-3 px-4 py-3">
                  <FileUp className="size-5 text-muted-foreground" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">Drop image here or click to upload</p>
                    <p className="text-xs text-muted-foreground">Max 10MB</p>
                  </div>
                </FileUploadDropzone>
                <FileUploadList>
                  {addPhotoFile && (
                    <FileUploadItem value={addPhotoFile}>
                      <FileUploadItemPreview />
                      <FileUploadItemMetadata />
                      <FileUploadItemDelete asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <X className="size-4" />
                        </Button>
                      </FileUploadItemDelete>
                    </FileUploadItem>
                  )}
                </FileUploadList>
              </FileUpload>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Assigned Expeditions</Label>
              {!expeditions || expeditions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expeditions available</p>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {expeditions.map((expedition) => (
                    <button
                      key={expedition.id}
                      type="button"
                      onClick={() => handleAddExpeditionToggle(expedition.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={addForm.expeditions_id.includes(expedition.id)}
                        onChange={() => handleAddExpeditionToggle(expedition.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{expedition.name}</div>
                        {expedition.startDate && expedition.endDate && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {expedition.startDate} — {expedition.endDate}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t shrink-0">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setAddSheetOpen(false)}
                className="flex-1 cursor-pointer"
                disabled={isSavingAdd}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAdd}
                className="flex-1 cursor-pointer"
                disabled={isSavingAdd || !addForm.recipe_name.trim() || addForm.types.length === 0}
              >
                {isSavingAdd ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    {isUploadingAddPhoto ? "Uploading photo..." : "Creating..."}
                  </>
                ) : (
                  "Create Recipe"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Recipe Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle>Edit Recipe</SheetTitle>
              <button
                type="button"
                onClick={() => setEditSheetOpen(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <SheetDescription>
              Update details for{" "}
              <span className="font-medium">{editRecipe?.recipe_name}</span>
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Recipe Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-recipe-name" className="text-sm font-medium">Recipe Name</Label>
              <Input
                id="edit-recipe-name"
                value={editForm.recipe_name}
                onChange={(e) => setEditForm({ ...editForm, recipe_name: e.target.value })}
                placeholder="e.g., Chicken Alfredo"
                className="h-11"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type</Label>
              <div className="flex flex-wrap gap-2">
                {["Breakfast", "Lunch", "Dinner", "Snack"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditForm(f => ({
                      ...f,
                      types: f.types.includes(t) ? f.types.filter(x => x !== t) : [...f.types, t]
                    }))}
                    className={cn(
                      "px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors",
                      editForm.types.includes(t)
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Cooking and Prep Time */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Total Cooking and Prep Time</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={String(Math.floor(parseInt(editForm.duration_minutes) / 60) || 0)}
                  onValueChange={(val) => {
                    const hours = parseInt(val)
                    const currentMins = (parseInt(editForm.duration_minutes) || 0) % 60
                    setEditForm({ ...editForm, duration_minutes: String(hours * 60 + currentMins) })
                  }}
                >
                  <SelectTrigger className="h-11 flex-1 cursor-pointer">
                    <SelectValue placeholder="Hours" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 7 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>{i} {i === 1 ? "hour" : "hours"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String((parseInt(editForm.duration_minutes) || 0) % 60)}
                  onValueChange={(val) => {
                    const mins = parseInt(val)
                    const currentHours = Math.floor((parseInt(editForm.duration_minutes) || 0) / 60)
                    setEditForm({ ...editForm, duration_minutes: String(currentHours * 60 + mins) })
                  }}
                >
                  <SelectTrigger className="h-11 flex-1 cursor-pointer">
                    <SelectValue placeholder="Minutes" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                      <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recipe Photo */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Recipe Photo</Label>
              {editPhotoPreview && !editPhotoFile && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={editPhotoPreview}
                    alt="Current recipe photo"
                    className="object-cover w-full h-full"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setEditPhotoPreview(null)
                      setEditForm({ ...editForm, recipe_photo: null })
                    }}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-md p-1 cursor-pointer transition-colors"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              )}
              <FileUpload
                maxFiles={1}
                maxSize={10 * 1024 * 1024}
                accept="image/*"
                value={editPhotoFile ? [editPhotoFile] : []}
                onValueChange={(files) => {
                  const file = files[0] || null
                  setEditPhotoFile(file)
                  setEditPhotoPreview(file ? URL.createObjectURL(file) : null)
                }}
              >
                <FileUploadDropzone className="flex-row gap-3 px-4 py-3">
                  <FileUp className="size-5 text-muted-foreground" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{editPhotoPreview && !editPhotoFile ? "Replace photo" : "Drop image here or click to upload"}</p>
                    <p className="text-xs text-muted-foreground">Max 10MB</p>
                  </div>
                </FileUploadDropzone>
                <FileUploadList>
                  {editPhotoFile && (
                    <FileUploadItem value={editPhotoFile}>
                      <FileUploadItemPreview />
                      <FileUploadItemMetadata />
                      <FileUploadItemDelete asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <X className="size-4" />
                        </Button>
                      </FileUploadItemDelete>
                    </FileUploadItem>
                  )}
                </FileUploadList>
              </FileUpload>
            </div>

            {/* Assigned Expeditions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assigned Expeditions</Label>
              {!expeditions || expeditions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expeditions available</p>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {expeditions.map((expedition) => (
                    <button
                      key={expedition.id}
                      type="button"
                      onClick={() => handleEditExpeditionToggle(expedition.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={editForm.expeditions_id.includes(expedition.id)}
                        onChange={() => handleEditExpeditionToggle(expedition.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{expedition.name}</div>
                        {expedition.startDate && expedition.endDate && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {expedition.startDate} — {expedition.endDate}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t shrink-0">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setEditSheetOpen(false)}
                className="flex-1 cursor-pointer"
                disabled={isSavingEdit}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="flex-1 cursor-pointer"
                disabled={isSavingEdit || !editForm.recipe_name.trim()}
              >
                {isSavingEdit ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    {isUploadingEditPhoto ? "Uploading photo..." : "Saving..."}
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Assign All Recipes to Expedition Sheet */}
      <Sheet open={assignSheetOpen} onOpenChange={setAssignSheetOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle>Assign All Recipes</SheetTitle>
              <button
                type="button"
                onClick={() => setAssignSheetOpen(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <SheetDescription>
              Select an expedition to assign all {recipes?.length || 0} recipes to.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {!expeditions || expeditions.length === 0 ? (
              <div className="p-6">
                <p className="text-sm text-muted-foreground">No expeditions available</p>
              </div>
            ) : (
              <div className="py-2">
                {expeditions.map((expedition: any) => (
                  <button
                    key={expedition.id}
                    type="button"
                    onClick={() => setSelectedExpeditionForAssign(expedition.id)}
                    className={`w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors text-left cursor-pointer border-b border-gray-100 last:border-b-0 ${
                      selectedExpeditionForAssign === expedition.id ? "bg-gray-50" : ""
                    }`}
                  >
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedExpeditionForAssign === expedition.id
                        ? "border-blue-600 bg-blue-600"
                        : "border-gray-300"
                    }`}>
                      {selectedExpeditionForAssign === expedition.id && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{expedition.name}</div>
                      {expedition.startDate && expedition.endDate && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {expedition.startDate} — {expedition.endDate}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-t shrink-0">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setAssignSheetOpen(false)}
                className="flex-1 cursor-pointer"
                disabled={isAssigning}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignAllToExpedition}
                className="flex-1 cursor-pointer"
                disabled={isAssigning || !selectedExpeditionForAssign}
              >
                {isAssigning ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Assigning...
                  </>
                ) : (
                  "Assign All"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  )
}
