import Vue from 'vue'
import Router from 'vue-router'

import Globe from '@/components/Globe'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Globe',
      component: Globe
    }
  ]
})
