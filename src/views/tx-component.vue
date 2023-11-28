<template>
  <div>
    <div class="flex align-center justify-center" style="margin-top: 10px">
      <el-select
        v-model="env"
        @change="updateEnv"
        placeholder="环境"
        style="margin-right: 20px"
      >
        <el-option
          v-for="item in evnList"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        ></el-option>
      </el-select>
      <div
        class="flex justify-center align-center"
        v-if="!$store.state.walletConnect"
      >
        <el-button type="primary" @click="connect('MetaMask')"
          >连接MetaMask钱包</el-button
        >
      </div>

      <div v-else class="flex justify-center align-center">
        <div>{{ $store.state.walletAddress }}</div>
        <el-button @click="disconnect" style="margin-left: 10px"
          >断开连接</el-button
        >
      </div>
    </div>
  </div>
  <van-notify v-model:show="show" type="success">
    <van-loading style="margin-right: 4px" />
    <span
      ><a target="_blank" :href="scan">{{
        "The transaction is being submitted, and the transaction is being confirmed"
      }}</a></span
    >
  </van-notify>
</template>

<script>
import { showToast } from "vant";
import { UPDATE_ENV, WALLET_CONNECT_MUTATION } from "@/store/mutation-types";
import {
  ConnectManager,
  getCurrentAddressInfo,
  initAddress,
  WalletConnect,
} from "charmander-sdk";

export default {
  name: "tx-component",
  data() {
    return {
      show: false,
      scan: "",
      evnList: [
        {
          label: "主网",
          value: "prod",
        },
        {
          label: "测试网",
          value: "test",
        },
      ],
      env: "test",
    };
  },
  watch: {},
  methods: {
    updateEnv(env) {
      if (env === this.$store.state.env) {
        return;
      }
      this.env = env;
      this.$store.commit(UPDATE_ENV, env);
      initAddress(this.env);
      this.disconnect();
    },
    disconnect() {
      this.$store.commit(WALLET_CONNECT_MUTATION, {
        walletConnect: false, // 钱包连接状态
        walletName: "",
        walletAddress: "",
      });
      ConnectManager.disConnect();
    },
    async updateWallet(walletConnect, walletName) {
      try {
        let connectInfo = await ConnectManager.connect(walletConnect);

        if (connectInfo.chainId === getCurrentAddressInfo().chainId) {
          this.$store.commit(WALLET_CONNECT_MUTATION, {
            walletConnect: connectInfo.status, // 钱包连接状态
            walletName: walletName,
            walletAddress: connectInfo.account,
          });
          console.log("wallet connect successful", this);
          showToast("wallet connect successful");
        } else {
          this.$store.commit(WALLET_CONNECT_MUTATION, {
            walletConnect: false, // 钱包连接状态
            walletName: "",
            walletAddress: "",
          });
          ConnectManager.addMetamaskChain(getCurrentAddressInfo().chainName);
          showToast("Please switch wallet network");
        }
      } catch (e) {
        console.log(e);
        //await ConnectManager.disConnect();
        throw e;
      }
    },
    async connect(walletName) {
      try {
        let walletConnect;
        if (walletName === "MetaMask") {
          walletConnect = await WalletConnect.connectMetaMask();
        }

        await this.updateWallet(walletConnect, walletName);

        let provider = walletConnect.provider;
        provider.on("accountsChanged", async () => {
          this.$store.commit(WALLET_CONNECT_MUTATION, {
            walletConnect: false, // 钱包连接状态
            walletName: "",
            walletAddress: "",
          });
          await this.updateWallet(walletConnect, walletName);
        });
        provider.on("chainChanged", async () => {
          this.$store.commit(WALLET_CONNECT_MUTATION, {
            walletConnect: false, // 钱包连接状态
            walletName: "",
            walletAddress: "",
          });
          await this.updateWallet(walletConnect, walletName);
        });
      } catch (e) {
        console.error(e);
        showToast(e.message);
      }
    },
    async sendTx(func, successCallback) {
      try {
        let connectInfo = ConnectManager.getConnect();
        let transactionEvent = await func(connectInfo);
        this.scan = transactionEvent.scan();
        this.show = true;
        await transactionEvent.confirm();
        await successCallback();
        showToast("Transaction submitted successfully");
        return transactionEvent;
      } catch (e) {
        console.error(e);
        showToast("合约报错：" + (e.message || e));
      } finally {
        setTimeout(() => {
          this.show = false;
        }, 5000);
      }
    },
  },
  mounted() {
    this.env = this.$store.state.env;
    initAddress(this.env);
    if (!this.$store.state.walletConnect) {
      if (this.$store.state.walletName !== "") {
        this.connect(this.$store.state.walletName);
      }
    }
  },
};
</script>
<style lang="less"></style>
