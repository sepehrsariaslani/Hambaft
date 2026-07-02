<template>
  <div class="page pb-24">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4">
      <div class="flex items-center justify-between">
        <h1 class="text-h1 font-display text-[var(--color-text)]">دسته‌بندی‌ها</h1>
        <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="showCreate = true">
          <Plus :size="20" />
        </button>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="px-4 space-y-2">
      <HbSkeleton variant="card" height="56" class="rounded-xl" />
      <HbSkeleton variant="card" height="56" class="rounded-xl" />
      <HbSkeleton variant="card" height="56" class="rounded-xl" />
    </div>

    <!-- Error -->
    <FinanceErrorState v-else-if="error" @retry="fetchCategories" />

    <!-- Empty -->
    <HbEmptyState
      v-else-if="categories.length === 0"
      icon="folder"
      title="دسته‌بندی‌ای نساختید"
      description="دسته‌بندی‌ها را برای سازماندهی تراکنش‌ها اضافه کنید"
      action-label="ایجاد دسته‌بندی"
      @action="showCreate = true"
    />

    <!-- Category Tree -->
    <div v-else class="px-4 space-y-2">
      <div v-for="cat in rootCategories" :key="cat.name">
        <!-- Parent Category -->
        <HbCard padding="p-4">
          <div class="flex items-center gap-3">
            <button
              v-if="getChildren(cat.name).length"
              class="w-6 h-6 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center"
              @click="toggleExpand(cat.name)"
            >
              <ChevronDown :size="14" :class="expanded.includes(cat.name) ? 'rotate-180' : ''" class="transition-transform" />
            </button>
            <div v-else class="w-6" />
            <div class="w-10 h-10 rounded-full flex items-center justify-center" :style="{ backgroundColor: cat.color || 'var(--color-purple)' }">
              <component :is="getIcon(cat.icon)" :size="18" class="text-white" />
            </div>
            <div class="flex-1">
              <p class="text-body font-bold text-[var(--color-text)]">{{ cat.category_name }}</p>
              <HbTag variant="pastel" pastel="purple" class="mt-0.5">{{ cat.category_type }}</HbTag>
            </div>
          </div>
        </HbCard>

        <!-- Children -->
        <div v-if="expanded.includes(cat.name)" class="ms-6 mt-1 space-y-1">
          <HbCard
            v-for="child in getChildren(cat.name)"
            :key="child.name"
            padding="p-3"
            interactive
            @click="openEdit(child)"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full flex items-center justify-center" :style="{ backgroundColor: child.color || 'var(--color-ice-blue)' }">
                <component :is="getIcon(child.icon)" :size="14" class="text-white" />
              </div>
              <div class="flex-1">
                <p class="text-body text-[var(--color-text)]">{{ child.category_name }}</p>
                <p class="text-xs text-[var(--color-text-tertiary)]">{{ child.category_type }}</p>
              </div>
            </div>
          </HbCard>

          <!-- Grandchildren -->
          <div v-for="child in getChildren(cat.name)" :key="child.name + '_grand'" class="ms-4 mt-1 space-y-1">
            <HbCard
              v-for="grandchild in getChildren(child.name)"
              :key="grandchild.name"
              padding="p-2"
              interactive
              @click="openEdit(grandchild)"
            >
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full flex items-center justify-center" :style="{ backgroundColor: grandchild.color || 'var(--color-yellow)' }">
                  <component :is="getIcon(grandchild.icon)" :size="12" class="text-white" />
                </div>
                <p class="text-sm text-[var(--color-text)]">{{ grandchild.category_name }}</p>
              </div>
            </HbCard>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <HbModal v-model="showCreate" :title="editing ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'">
      <div class="space-y-4">
        <HbInput v-model="form.category_name" label="نام دسته‌بندی" required :error="errors.category_name" />
        <div>
          <label class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">نوع</label>
          <div class="flex flex-wrap gap-2">
            <HbTag
              v-for="t in categoryTypes"
              :key="t"
              :variant="form.category_type === t ? 'active' : 'default'"
              selectable
              @click="form.category_type = t"
            >{{ t }}</HbTag>
          </div>
        </div>
        <FinanceColorPicker v-model="form.color" label="رنگ" />
        <FinanceIconPicker v-model="form.icon" label="آیکون" />
        <FinanceSelectSheet
          v-model="form.parent_category"
          label="دسته‌بندی والد"
          :items="parentOptions"
          display-field="category_name"
        />
        <HbInput v-model="form.description" label="توضیحات" type="textarea" />
        <HbButton block :loading="saving" @click="save">{{ editing ? 'ذخیره' : 'ایجاد' }}</HbButton>
        <HbButton v-if="editing" block variant="danger" @click="handleDelete">حذف دسته‌بندی</HbButton>
      </div>
    </HbModal>

    <!-- FAB -->
    <HbFab @click="showCreate = true">
      <Plus :size="24" />
    </HbFab>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useFinanceApi } from '@/composables/useFinanceApi'
import HbCard from '@/components/ui/HbCard.vue'
import HbTag from '@/components/ui/HbTag.vue'
import HbInput from '@/components/ui/HbInput.vue'
import HbButton from '@/components/ui/HbButton.vue'
import HbSkeleton from '@/components/ui/HbSkeleton.vue'
import HbModal from '@/components/ui/HbModal.vue'
import HbFab from '@/components/ui/HbFab.vue'
import HbEmptyState from '@/components/ui/HbEmptyState.vue'
import FinanceErrorState from '@/components/finance/FinanceErrorState.vue'
import FinanceColorPicker from '@/components/finance/FinanceColorPicker.vue'
import FinanceIconPicker from '@/components/finance/FinanceIconPicker.vue'
import FinanceSelectSheet from '@/components/finance/FinanceSelectSheet.vue'
import { Plus, ChevronDown } from 'lucide-vue-next'
import * as icons from 'lucide-vue-next'

const api = useFinanceApi()
const loading = ref(true)
const error = ref(null)
const categories = ref([])
const expanded = ref([])
const showCreate = ref(false)
const editing = ref(null)
const saving = ref(false)

const categoryTypes = ['درآمد', 'هزینه', 'انتقال', 'پس‌انداز', 'بدهی']

const form = reactive({
  category_name: '',
  category_type: 'هزینه',
  color: '',
  icon: '',
  parent_category: '',
  description: '',
})
const errors = reactive({ category_name: '' })

const rootCategories = computed(() => {
  return categories.value.filter(c => !c.parent_category || c.parent_category === '')
})

const parentOptions = computed(() => {
  return categories.value.filter(c => c.name !== editing.value?.name)
})

function getChildren(parentName) {
  return categories.value.filter(c => c.parent_category === parentName)
}

function toggleExpand(name) {
  const idx = expanded.value.indexOf(name)
  if (idx >= 0) expanded.value.splice(idx, 1)
  else expanded.value.push(name)
}

function getIcon(iconName) {
  if (!iconName) return icons.Folder
  return icons[iconName] || icons.Folder
}

function openEdit(cat) {
  editing.value = cat
  form.category_name = cat.category_name
  form.category_type = cat.category_type
  form.color = cat.color || ''
  form.icon = cat.icon || ''
  form.parent_category = cat.parent_category || ''
  form.description = cat.description || ''
  showCreate.value = true
}

function resetForm() {
  form.category_name = ''
  form.category_type = 'هزینه'
  form.color = ''
  form.icon = ''
  form.parent_category = ''
  form.description = ''
  errors.category_name = ''
  editing.value = null
}

async function save() {
  errors.category_name = !form.category_name ? 'نام دسته‌بندی الزامی است' : ''
  if (errors.category_name) return

  saving.value = true
  try {
    if (editing.value) {
      await api.updateCategory(editing.value.name, { ...form })
    } else {
      await api.createCategory({ ...form })
    }
    showCreate.value = false
    resetForm()
    fetchCategories()
  } catch (e) {
    alert('خطا در ذخیره')
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!editing.value) return
  if (!confirm('آیا از حذف این دسته‌بندی مطمئن هستید؟')) return
  try {
    await api.deleteCategory(editing.value.name)
    showCreate.value = false
    resetForm()
    fetchCategories()
  } catch (e) {
    alert('خطا در حذف')
  }
}

async function fetchCategories() {
  loading.value = true
  error.value = null
  try {
    categories.value = await api.getCategories()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCategories()
})
</script>
