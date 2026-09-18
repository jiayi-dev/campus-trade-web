<template>
  <div class="goods-page">

    <div class="page-header">
      <h2>商品中心</h2>

      <div>
        <el-button @click="handleBatchAdd">
          批量发布
        </el-button>

      <el-button type="primary" @click="handleAdd">
        发布商品
      </el-button>
    </div>
      </div>

    <!-- 搜索区域 -->
    <div class="search-bar">

      <el-input
          v-model="goodsName"
          placeholder="请输入商品名称"
          clearable
          style="width: 240px"
      />

      <el-button type="primary" @click="handleSearch">
        查询
      </el-button>

      <el-button @click="handleReset">
        重置
      </el-button>

    </div>

    <!-- 商品表格 -->
    <el-table
        :data="goodsList"
        border
        style="width: 100%"
    >

      <el-table-column
          prop="goodsId"
          label="商品ID"
          width="90"
      />

      <el-table-column
          prop="goodsName"
          label="商品名称"
      />

      <el-table-column
          prop="price"
          label="价格"
          width="120"
      />

      <el-table-column
          prop="status"
          label="状态"
          width="100"
      />

      <el-table-column
          prop="createTime"
          label="发布时间"
      />

      <el-table-column
          label="操作"
          width="180"
      >
        <template #default="scope">

          <el-button
              type="primary"
              link
              @click="handleEdit(scope.row.goodsId)"
          >
            编辑
          </el-button>

          <el-button
              type="danger"
              link
              @click="handleDelete(scope.row.goodsId)"
          >
            删除
          </el-button>

        </template>
      </el-table-column>

    </el-table>

    <!-- 分页 -->
    <div class="pagination">

      <el-pagination
          v-model:current-page="pageNum"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadGoods"
      />

    </div>


    <!-- 新增 / 编辑商品弹窗 -->
    <el-dialog
        v-model="dialogVisible"
        :title="isEdit ? '编辑商品' : '发布商品'"
        width="500px"
    >

      <el-form label-width="90px">

        <el-form-item label="商品名称">
          <el-input
              v-model="form.goodsName"
              placeholder="请输入商品名称"
          />
        </el-form-item>

        <el-form-item label="商品分类">
          <el-input
              v-model.number="form.categoryId"
              placeholder="请输入分类ID"
          />
        </el-form-item>

        <el-form-item label="商品价格">
          <el-input
              v-model.number="form.price"
              type="number"
              placeholder="请输入商品价格"
          />
        </el-form-item>

        <el-form-item label="商品描述">
          <el-input
              v-model="form.description"
              type="textarea"
              :rows="4"
              placeholder="请输入商品描述"
          />
        </el-form-item>

        <el-form-item label="商品状态">
          <el-select
              v-model="form.status"
              style="width: 100%"
          >
            <el-option label="在售" :value="1" />
            <el-option label="下架" :value="0" />
          </el-select>
        </el-form-item>

      </el-form>

      <template #footer>

        <el-button @click="dialogVisible = false">
          取消
        </el-button>

        <el-button
            type="primary"
            @click="handleSave"
        >
          保存
        </el-button>

      </template>

    </el-dialog>

      <el-dialog
          v-model="batchDialogVisible"
          title="批量发布商品"
          width="900px"
      >
        <el-table :data="batchGoodsList" border>
          <el-table-column
              type="index"
              label="行号"
              width="70"
          />

          <el-table-column label="商品名称">
            <template #default="scope">
              <el-input
                  v-model="scope.row.goodsName"
                  placeholder="请输入商品名称"
              />
            </template>
          </el-table-column>

          <el-table-column label="分类ID" width="120">
            <template #default="scope">
              <el-input
                  v-model.number="scope.row.categoryId"
                  placeholder="分类ID"
              />
            </template>
          </el-table-column>

          <el-table-column label="价格" width="150">
            <template #default="scope">
              <el-input
                  v-model.number="scope.row.price"
                  type="number"
                  placeholder="价格"
              />
            </template>
          </el-table-column>

          <el-table-column label="商品描述">
            <template #default="scope">
              <el-input
                  v-model="scope.row.description"
                  placeholder="商品描述"
              />
            </template>
          </el-table-column>
        </el-table>

        <template #footer>
          <el-button @click="batchDialogVisible = false">
            取消
          </el-button>

          <el-button type="primary" @click="handleBatchSave">
            批量发布
          </el-button>
        </template>
      </el-dialog>

  </div>
</template>


<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'


// =========================
// 页面数据
// =========================

const goodsName = ref('')
const goodsList = ref([])

const pageNum = ref(1)
const pageSize = ref(5)
const total = ref(0)


// =========================
// 弹窗相关
// =========================

const dialogVisible = ref(false)

// false = 新增
// true = 编辑
const isEdit = ref(false)

// 批量发布弹窗
const batchDialogVisible = ref(false)

// 批量发布商品列表
const batchGoodsList = ref([])


// 商品表单
const form = ref({
  goodsId: null,
  userId: null,
  categoryId: null,
  goodsName: '',
  description: '',
  price: null,
  status: 1
})


// =========================
// 查询商品
// =========================

const loadGoods = async () => {

  try {

    const result = await request.get('/goods/page', {
      params: {
        goodsName: goodsName.value || undefined,
        pageNum: pageNum.value,
        pageSize: pageSize.value
      }
    })

    goodsList.value = result.list
    total.value = result.total

  } catch (error) {
    // request.js 已经统一提示错误
  }
}


// =========================
// 搜索
// =========================

const handleSearch = () => {

  pageNum.value = 1

  loadGoods()
}


// =========================
// 重置搜索
// =========================

const handleReset = () => {

  goodsName.value = ''
  pageNum.value = 1

  loadGoods()
}


// =========================
// 点击“发布商品”
// =========================

const handleAdd = () => {

  isEdit.value = false

  form.value = {
    goodsId: null,
    userId: Number(localStorage.getItem('userId')),
    categoryId: null,
    goodsName: '',
    description: '',
    price: null,
    status: 1
  }

  dialogVisible.value = true
}


// =========================
// 点击“批量发布”
// =========================

const handleBatchAdd = () => {

  batchGoodsList.value = Array.from(
      { length: 5 },
      () => ({
        userId: Number(localStorage.getItem('userId')),
        categoryId: null,
        goodsName: '',
        description: '',
        price: null,
        status: 1
      })
  )

  batchDialogVisible.value = true
}

// =========================
// 点击“编辑”
// =========================

const handleEdit = async (goodsId) => {

  try {

    const result = await request.get(`/goods/${goodsId}`)

    isEdit.value = true

    form.value = {
      goodsId: result.goodsId,
      userId: result.userId,
      categoryId: result.categoryId,
      goodsName: result.goodsName,
      description: result.description,
      price: result.price,
      status: result.status
    }

    dialogVisible.value = true

  } catch (error) {
    // request.js 已经统一提示错误
  }
}


// =========================
// 保存商品
// =========================

const handleSave = async () => {

  if (!form.value.goodsName) {
    ElMessage.warning('请输入商品名称')
    return
  }

  if (
      form.value.price === null ||
      form.value.price === ''
  ) {
    ElMessage.warning('请输入商品价格')
    return
  }

  try {

    if (isEdit.value) {

      // 编辑商品
      const result = await request.put(
          '/goods',
          form.value
      )

      ElMessage.success(result)

    } else {

      // 新增商品
      const result = await request.post(
          '/goods',
          {
            ...form.value,
            userId: Number(localStorage.getItem('userId'))
          }
      )

      ElMessage.success(result)
    }

    dialogVisible.value = false

    loadGoods()

  } catch (error) {
    // request.js 已经统一提示错误
  }
}


// =========================
// 批量发布商品
// =========================

const handleBatchSave = async () => {

  // 过滤完全没有填写的空行
  const validGoodsList = batchGoodsList.value.filter(item => {
    return (
        item.goodsName ||
        item.categoryId !== null ||
        item.price !== null ||
        item.description
    )
  })

  // 一行都没有填写
  if (validGoodsList.length === 0) {
    ElMessage.warning('请至少填写一条商品信息')
    return
  }

  // 检查商品名称和价格
  for (let i = 0; i < validGoodsList.length; i++) {

    const goods = validGoodsList[i]

    if (!goods.goodsName || !goods.goodsName.trim()) {
      ElMessage.warning(`第${i + 1}行：商品名称不能为空`)
      return
    }

    if (goods.price === null || goods.price === '') {
      ElMessage.warning(`第${i + 1}行：商品价格不能为空`)
      return
    }

    if (goods.price < 0) {
      ElMessage.warning(`第${i + 1}行：商品价格不能小于0`)
      return
    }
  }

  try {

    const result = await request.post(
        '/goods/batch',
        validGoodsList
    )

    ElMessage.success(result)

    batchDialogVisible.value = false

    loadGoods()

  } catch (error) {
    // request.js 已经统一提示错误
  }
}

// =========================
// 删除商品
// =========================

const handleDelete = async (goodsId) => {

  try {

    await ElMessageBox.confirm(
        '确定要删除这个商品吗？',
        '删除确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
    )

    const result = await request.delete(
        `/goods/${goodsId}`
    )

    ElMessage.success(result)

    loadGoods()

  } catch (error) {

    // 用户点击取消时不做处理

  }
}


// =========================
// 页面加载
// =========================

onMounted(() => {
  loadGoods()
})
</script>


<style scoped>

.goods-page {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

</style>