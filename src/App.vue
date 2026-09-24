<template>
  <!--
    路由切换淡入过渡（实测踩坑，勿改回 out-in）：
    当前技术栈 Vue 3.5 + vue-router 5 下，<transition mode="out-in"> 包裹 router-view
    插槽的动态组件时，旧组件离场结束后新组件不会被插入（#app 只剩注释节点 → 整页空白，
    无任何 JS 报错；整页直接打开 URL 不经过过渡，所以刷新正常、点击跳转才白）。
    使用默认同时过渡：新组件立即挂载，与旧组件交叉淡入淡出（离场元素由全局
    .fade-leave-active 设为 fixed 覆盖层，避免两个整页上下堆叠）。
    key 取「顶层外壳路径」matched[0].path：/home、/goods 同属 Layout 外壳，key 相同，
    切换时整个 Layout（含侧边栏）不会重挂，内部子路由交给 Layout 自己的 router-view；
    /landing、/login 等独立顶层页各自一个 key。仅 query 变化不重挂任何组件。
  -->
  <router-view v-slot="{ Component, route }">
    <transition name="fade">
      <component :is="Component" :key="route.matched[0]?.path ?? route.path" />
    </transition>
  </router-view>
</template>
