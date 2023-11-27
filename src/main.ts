import { createApp } from "vue";
import vant from "vant";
import "vant/lib/index.css";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "./assets/base.less";

createApp(App).use(store).use(router).use(vant).use(ElementPlus).mount("#app");
