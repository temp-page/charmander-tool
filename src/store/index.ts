import { createStore } from "vuex";
import { UPDATE_ENV, WALLET_CONNECT_MUTATION } from "@/store/mutation-types";
import createPersistedState from "vuex-persistedstate";

import SecureLS from "secure-ls";

const ls = new SecureLS({ isCompression: false });

export default createStore({
  state: {
    walletConnect: false, // 钱包连接状态
    walletName: "",
    walletAddress: "",
    env: "test",
  },
  getters: {},
  mutations: {
    [WALLET_CONNECT_MUTATION](state, data) {
      state.walletConnect = data.walletConnect;
      state.walletAddress = data.walletAddress;
      state.walletName = data.walletName;
      console.log("walletConnect ", data);
    },
    [UPDATE_ENV](state, data) {
      state.env = data;
    },
  },
  actions: {},
  modules: {},
  plugins: [
    createPersistedState({
      paths: ["walletName", "env"], //需要持久化的
      storage: {
        getItem: (key) => ls.get(key),
        setItem: (key, value) => ls.set(key, value),
        removeItem: (key) => ls.remove(key),
      },
    }),
  ],
});
