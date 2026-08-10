export interface MarketIndexDef {
  code: string;
  name: string;
  market: number;
  /** 指数覆盖范围 / 代表板块说明 */
  desc: string;
}

/** 大盘常用指数（market: 1=上证，0=深证） */
export const MARKET_INDICES: MarketIndexDef[] = [
  {
    code: '000001',
    name: '上证指数',
    market: 1,
    desc: '沪市全部 A 股，反映上海市场整体走势',
  },
  {
    code: '399001',
    name: '深证成指',
    market: 0,
    desc: '深市主板代表，覆盖深圳主要上市公司',
  },
  {
    code: '399006',
    name: '创业板指',
    market: 0,
    desc: '创业板龙头，科技成长与新兴产业',
  },
  {
    code: '000688',
    name: '科创50',
    market: 1,
    desc: '科创板龙头 50 家，硬科技、半导体等',
  },
  {
    code: '000300',
    name: '沪深300',
    market: 1,
    desc: '沪深市值前 300，大盘蓝筹核心资产',
  },
  {
    code: '000905',
    name: '中证500',
    market: 1,
    desc: '中盘股代表，制造、消费、医药等',
  },
  {
    code: '000852',
    name: '中证1000',
    market: 1,
    desc: '小盘股代表，题材活跃、波动较大',
  },
  {
    code: '000016',
    name: '上证50',
    market: 1,
    desc: '沪市超大盘蓝筹，金融、能源龙头',
  },
  {
    code: '000010',
    name: '上证180',
    market: 1,
    desc: '沪市大中型优质企业',
  },
  {
    code: '000698',
    name: '科创100',
    market: 1,
    desc: '科创板中盘成长，覆盖比科创50更广',
  },
  {
    code: '399330',
    name: '深证100',
    market: 0,
    desc: '深市龙头 100 家，消费、科技为主',
  },
  {
    code: '399005',
    name: '中小100',
    market: 0,
    desc: '深市中小企业代表',
  },
  {
    code: '399303',
    name: '国证2000',
    market: 0,
    desc: '小微盘代表，题材与高波动风格',
  },
];
