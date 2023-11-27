<template>
  <tx-component ref="tx"></tx-component>
  <hr />
  <div
    class="common-layout"
    style="margin-top: 20px"
    v-if="$store.state.walletConnect"
  >
    <div>
      <el-select
        v-model="epoch"
        @change="reset"
        placeholder="轮次"
        style="margin-left: 10px"
      >
        <el-option
          v-for="item in epochList"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        ></el-option>
      </el-select>

      <el-button style="margin-left: 10px" type="primary" @click="init"
        >查询</el-button
      >
    </div>

    <div>
      <h5>
        环境 : {{ listData.env }} | 轮次: {{ listData.epoch }}| 合约地址 :
        {{ listData.contractAddress }}
      </h5>

      <h4>总金额 : {{ listData.totalMnt }} MNT</h4>

      <p v-if="contract.show">
        <el-button
          :disabled="!contract.canEpoch"
          type="primary"
          @click="updateEpoch"
          >(1)更新轮次</el-button
        >
        <el-button
          :disabled="contract.canEpoch || !contract.canSend"
          type="primary"
          @click="send"
          >(2)发放奖励</el-button
        >
      </p>

      <el-table border :data="listData.list" stripe style="width: 100%">
        <el-table-column type="expand" label="明细">
          <template #default="props">
            <div style="padding: 50px">
              <el-table :data="props.row.pools" :border="true">
                <el-table-column label="池子地址" prop="poolAddress" />
                <el-table-column label="活跃用户数量" prop="userCount" />
                <el-table-column label="TVL(USD)" prop="tvlUsd" />
                <el-table-column label="成交量(USD)" prop="volumeUsd" />
                <el-table-column label="分数" prop="score" />
              </el-table>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="项目方地址" prop="user"></el-table-column>
        <el-table-column label="金额" prop="reward"></el-table-column>
        <el-table-column label="总分数">
          <template #default="scope">
            {{ totalScore(scope.row.pools) }}
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style lang="less"></style>
<script>
import {
  AgniProjectPartyReward,
  BigNumber,
  ConnectManager,
  getCurrentAddressInfo,
} from "charmander-sdk";
import { ElMessage, ElNotification } from "element-plus";
import TxComponent from "@/views/tx-component.vue";

export default {
  name: "HomeView",
  components: { TxComponent },
  data() {
    return {
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
      epoch: 1,
      epochList: Array.from({ length: 5 }, (v, k) => {
        return {
          label: `Epoch ${k + 1}`,
          value: k + 1,
        };
      }),
      listData: {
        list: [],
        totalMnt: "0",
        contractAddress: "",
        env: "",
        epoch: "",
      },
      contract: {
        show: false,
        canEpoch: false,
        canSend: false,
      },
    };
  },
  watch: {
    ["$store.state.walletAddress"]() {
      this.reset();
    },
  },
  methods: {
    reset() {
      this.listData = {
        list: [],
        totalMnt: "0",
        contractAddress: "",
        env: "",
        epoch: "",
      };
      this.contract = {
        show: false,
        canEpoch: false,
        canSend: false,
      };
    },
    totalScore(pool) {
      return pool.reduce((acc, cur) => {
        return new BigNumber(acc).plus(cur.score).toFixed();
      }, "0");
    },
    async updateEpoch() {
      await this.$refs.tx.sendTx(
        () => {
          let connectInfo = ConnectManager.getConnect();
          let agniProjectPartyReward = connectInfo.create(
            AgniProjectPartyReward,
            this.listData.contractAddress
          );
          return agniProjectPartyReward.setEpoch(this.epoch);
        },
        () => {
          this.init();
        }
      );
    },
    async send() {
      await this.$refs.tx.sendTx(
        () => {
          let connectInfo = ConnectManager.getConnect();
          let agniProjectPartyReward = connectInfo.create(
            AgniProjectPartyReward,
            this.listData.contractAddress
          );
          return agniProjectPartyReward.setReward(
            this.epoch,
            this.listData.list.map((item) => item.user),
            this.listData.list.map((item) =>
              new BigNumber(item.reward)
                .multipliedBy(1e18)
                .toFixed(0, BigNumber.ROUND_DOWN)
            )
          );
        },
        () => {
          this.init();
        }
      );
    },
    async init() {
      const loading = this.$loading({ fullscreen: true });
      try {
        this.reset();
        this.listData.env = this.evnList.find(
          (item) => item.value === this.$store.state.env
        ).label;
        this.listData.epoch = this.epochList.find(
          (item) => item.value === this.epoch
        ).label;
        let baseApi = getCurrentAddressInfo().getApi().baseApi;
        this.listData.contractAddress =
          (
            await getCurrentAddressInfo()
              .getApi()
              .baseApi.request(
                `${
                  baseApi.address().baseApiUrl
                }/server_api/project-party-reward`,
                "get",
                {}
              )
          ).contractAddress || "0x0Dd6FA9377d623393081505ebB08530128526787";
        let result = await baseApi.request(
          `${
            baseApi.address().baseApiUrl
          }/server_api/project-party-reward/settlement?epoch=${this.epoch}`,
          "get",
          {}
        );
        this.listData.list = result;
        this.listData.totalMnt = result.reduce((acc, cur) => {
          return new BigNumber(acc).plus(cur.reward).toFixed();
        }, "0");

        let connectInfo = getCurrentAddressInfo().readonlyConnectInfo();
        let agniProjectPartyReward = connectInfo.create(
          AgniProjectPartyReward,
          this.listData.contractAddress
        );

        if (result.length === 0) {
          ElMessage.warning("没有数据");
          return;
        } else {
          let [multiCallResult] = await connectInfo.multiCall().call({
            epoch: agniProjectPartyReward.mulContract.epoch(),
            rewards: agniProjectPartyReward.mulContract.rewards(
              this.epoch,
              result[0].user
            ),
          });
          console.log(multiCallResult);
          this.contract.show = true;
          if (
            new BigNumber(multiCallResult.epoch)
              .plus(1)
              .comparedTo(this.epoch) === 0
          ) {
            this.contract.canEpoch = true;
          }
          if (new BigNumber(multiCallResult.rewards).comparedTo("0") === 0) {
            this.contract.canSend = true;
          }
        }
      } catch (e) {
        console.error(e);
        ElNotification.error({
          title: `错误`,
          message: e.message,
        });
      } finally {
        loading.close();
      }
    },
  },
};
</script>
