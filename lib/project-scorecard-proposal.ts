import type { ProjectScorecard } from '@/lib/project-schema';

/**
 * Initial, evidence-based review of the projects currently listed in the live directory.
 * Scores are editorial assessments, not investment advice. Revisit them as public usage data changes.
 */
export const initialProjectScorecards: Record<string, ProjectScorecard> = {
  vort: {
    delivery: { score: 4, applicable: true, noteEn: 'Live reward epochs, public settlement records, and an API for overview and epoch evidence are documented. The separate VORT launchpad remains in development. Source: https://vort.bot/epochs', noteZh: '奖励周期已运行，公开结算记录和查询周期证据的 API 均已提供；独立的 VORT Launchpad 仍在开发。来源：https://vort.bot/epochs' },
    adoption: { score: 4, applicable: true, noteEn: 'The official epoch page reports 44 settled records loaded, 980.23 USDC in creator receipts, and 882.21 USDC allocated to holders. Source: https://vort.bot/epochs', noteZh: '官方周期页报告已加载 44 条已结算记录、创作者收款 980.23 USDC、持币者分配 882.21 USDC。来源：https://vort.bot/epochs' },
    economics: { score: 4, applicable: true, noteEn: 'Creator proceeds flow into measurable epochs and holder budgets; records distinguish creator receipts, operations, and rewards. Source: https://vort.bot/docs', noteZh: '创作者收益进入可核验的周期与持币者预算，记录区分创作者收款、运营分配和持币者奖励。来源：https://vort.bot/docs' },
    security: { score: 3, applicable: true, noteEn: 'Block-pinned snapshots and settlement evidence are public, but the user-facing site reads a backend projection and no independent audit was verified. Source: https://vort.bot/docs', noteZh: '快照区块与结算证据公开可查，但网站读取后端数据投影，本次未核验到独立审计。来源：https://vort.bot/docs' },
    ecosystem: { score: 4, applicable: true, noteEn: 'Routes Argus creator proceeds into Arc holder rewards and supports multiple Arc reward assets. Source: https://vort.bot/docs', noteZh: '将 Argus 创作者收益接入 Arc 持币者奖励，并支持多种 Arc 奖励资产。来源：https://vort.bot/docs' },
  },
  kairo: {
    delivery: { score: 4, applicable: true, noteEn: 'The live platform documents markets, launches, swaps, perps, token creation, pools, and an agent product. Source: https://kairo.market/docs', noteZh: '线上平台已提供预测市场、代币发行、兑换、永续合约、代币创建、资金池和智能助手等产品。来源：https://kairo.market/docs' },
    adoption: { score: 3, applicable: true, noteEn: 'Several products are live and market data is read from Arc events, but comparable public usage totals were not verified in this review. Source: https://kairo.market/docs/protocol', noteZh: '多个产品已上线，市场数据直接读取 Arc 事件；本次未核验到可比较的公开使用总量。来源：https://kairo.market/docs/protocol' },
    economics: { score: 3, applicable: true, noteEn: 'Fees and creator earnings are documented across products, but verified aggregate protocol fees were not available in the reviewed sources. Source: https://kairo.market/docs', noteZh: '官方文档披露了各产品费用和创作者收益机制，但本次资料中未找到经核验的协议累计费用。来源：https://kairo.market/docs' },
    security: { score: 4, applicable: true, noteEn: 'The protocol reference explains contracts and event-level data reconstruction, with dedicated risk and security disclosures; this is not an independent audit. Source: https://kairo.market/docs/protocol', noteZh: '协议文档说明了合约与事件级数据重建方式，并提供风险和安全说明；这不等于独立审计。来源：https://kairo.market/docs/protocol' },
    ecosystem: { score: 5, applicable: true, noteEn: 'A broad Arc-native financial suite combines trading, launches, markets, and asset creation in one platform. Source: https://kairo.market/docs', noteZh: '将交易、发行、预测市场和资产创建整合为 Arc 原生综合金融平台，生态覆盖面突出。来源：https://kairo.market/docs' },
  },
  arcstocks: {
    delivery: { score: 4, applicable: true, noteEn: 'The live product issues STOCK.arc against cross-chain stock-token reserves and publishes a reserve/supply viewer. Source: https://arcstocks.app/reserves', noteZh: '产品已上线，用户可获取 STOCK.arc，项目并提供跨链储备与供应量查询页。来源：https://arcstocks.app/reserves' },
    adoption: { score: 2, applicable: true, noteEn: 'The reviewed public reserve page showed zero reserve value and zero reserve volume at review time, so demonstrated usage appears limited. Source: https://arcstocks.app/reserves', noteZh: '核验时官方储备页显示储备价值和储备交易量均为 0，已展示的实际使用仍有限。来源：https://arcstocks.app/reserves' },
    economics: { score: 2, applicable: true, noteEn: 'A 0.25% buy/sell fee is published, but the reserve page showed no accrued trading volume at review time. Source: https://arcstocks.app/reserves', noteZh: '官方披露买卖各收取 0.25% 费用，但核验时储备页尚未显示交易量。来源：https://arcstocks.app/reserves' },
    security: { score: 4, applicable: true, noteEn: 'The project publishes a two-chain reserve-versus-supply verification method and contract addresses; no independent audit was verified. Source: https://arcstocks.app/reserves', noteZh: '项目公开了双链储备与供应量核验方法及合约地址；本次未核验到独立审计。来源：https://arcstocks.app/reserves' },
    ecosystem: { score: 4, applicable: true, noteEn: 'Brings tokenized stock exposure and cross-chain assets into Arc applications. Source: https://arcstocks.app/', noteZh: '将代币化股票敞口和跨链资产带入 Arc 应用场景。来源：https://arcstocks.app/' },
  },
  arclight: {
    delivery: { score: 4, applicable: true, noteEn: 'Live documentation covers liquidity tooling, x402 payments, and an ERC-4626 USDC vault. Source: https://arclight.finance/docs/how-it-works', noteZh: '官方文档覆盖流动性工具、x402 支付和 ERC-4626 USDC 金库，产品交付较完整。来源：https://arclight.finance/docs/how-it-works' },
    adoption: { score: 3, applicable: true, noteEn: 'Products and integrations are available, but this review did not verify public usage or vault balance totals. Source: https://arclight.finance/vault', noteZh: '产品与集成已提供，但本次未核验到公开使用量或金库规模数据。来源：https://arclight.finance/vault' },
    economics: { score: 2, applicable: true, noteEn: 'A 0.15% liquidity-position mint fee is disclosed; realized fees and vault performance were not independently measured. Source: https://arclight.finance/docs/how-it-works', noteZh: '已披露 0.15% 流动性仓位铸造费；实际费用和金库表现未独立测量。来源：https://arclight.finance/docs/how-it-works' },
    security: { score: 4, applicable: true, noteEn: 'Contract addresses, vault mechanics, redemption limits, and operational dependencies are documented; documentation is not an audit. Source: https://arclight.finance/docs/security', noteZh: '已披露合约地址、金库机制、赎回限制和运维依赖；文档披露不等同于审计。来源：https://arclight.finance/docs/security' },
    ecosystem: { score: 4, applicable: true, noteEn: 'Provides shared liquidity, payment, and yield infrastructure for applications on Arc. Source: https://arclight.finance/docs/how-it-works', noteZh: '为 Arc 应用提供可复用的流动性、支付和收益基础设施。来源：https://arclight.finance/docs/how-it-works' },
  },
  argus: {
    delivery: { score: 4, applicable: true, noteEn: 'The live launchpad supports token discovery, creation, market activity, and holder rewards. Source: https://argus.world/docs', noteZh: '线上 Launchpad 已提供代币发现、创建、市场活动和持币者奖励功能。来源：https://argus.world/docs' },
    adoption: { score: 3, applicable: true, noteEn: 'Tokens and market activity are publicly browsable, but comparable protocol-level usage totals were not verified. Source: https://argus.world/docs', noteZh: '代币和市场活动可公开浏览，但本次未核验到可比较的协议级使用总量。来源：https://argus.world/docs' },
    economics: { score: 2, applicable: true, noteEn: 'Token-level taxes, allocations, and rewards are disclosed, but aggregate realized platform fees were not verified. Source: https://argus.world/docs', noteZh: '已披露代币级税费、分配和奖励，但本次未核验到平台累计实际费用。来源：https://argus.world/docs' },
    security: { score: 3, applicable: true, noteEn: 'Launch settings and transaction review guidance are documented; no independent audit was verified in the reviewed materials. Source: https://argus.world/docs', noteZh: '官方说明发行参数和交易核对流程；本次查阅资料未核验到独立审计。来源：https://argus.world/docs' },
    ecosystem: { score: 4, applicable: true, noteEn: 'An active Arc launchpad with token-level rewards and creator proceeds that other Arc applications can build on. Source: https://argus.world/docs', noteZh: '作为活跃的 Arc 发行平台，提供代币奖励与创作者收益等可供其他 Arc 应用使用的基础能力。来源：https://argus.world/docs' },
  },
  bagfi: {
    delivery: { score: 2, applicable: true, noteEn: 'The project is listed as upcoming; a production product or completed launch was not verified. Source: https://bagfi.fun/', noteZh: '项目当前登记为即将上线，本次未核验到生产产品或已完成发行。来源：https://bagfi.fun/' },
    adoption: { score: 1, applicable: true, noteEn: 'No public usage evidence was available in the reviewed project materials. Source: https://bagfi.fun/', noteZh: '本次查阅的项目资料中没有公开的使用数据。来源：https://bagfi.fun/' },
    economics: { score: 1, applicable: true, noteEn: 'No verified fees, revenue, or liquidity activity were found for the upcoming project. Source: https://bagfi.fun/', noteZh: '尚未找到该待上线项目经核验的手续费、收入或流动性活动。来源：https://bagfi.fun/' },
    security: { score: 1, applicable: true, noteEn: 'No public contract documentation or independent security review was verified. Source: https://bagfi.fun/', noteZh: '本次未核验到公开合约文档或独立安全审查。来源：https://bagfi.fun/' },
    ecosystem: { score: 2, applicable: true, noteEn: 'An ARC project is listed, but concrete integrations or infrastructure contribution were not verified. Source: https://bagfi.fun/', noteZh: '已收录为 ARC 项目，但尚未核验到具体集成或基础设施贡献。来源：https://bagfi.fun/' },
  },
  foci: {
    delivery: { score: 4, applicable: true, noteEn: 'The live launchpad has detailed docs for launch, graduation, fee flows, and holder rewards. Source: https://foci.family/documentation/fees', noteZh: '线上发行平台已提供发行、毕业、费用流转和持币者奖励的详细文档。来源：https://foci.family/documentation/fees' },
    adoption: { score: 3, applicable: true, noteEn: 'The product and contracts are deployed on Arc mainnet, but aggregate launch and trading usage was not measured here. Source: https://foci.family/documentation/abi', noteZh: '产品与合约已部署到 Arc 主网，但本次未测算发行数量和交易量总计。来源：https://foci.family/documentation/abi' },
    economics: { score: 3, applicable: true, noteEn: 'Published fee policy specifies a 1% curve/hook fee and 5 USDC launch fee; realized aggregate fees were not verified. Source: https://foci.family/documentation/fees', noteZh: '已披露 1% 曲线/Hook 费用和 5 USDC 发行费；本次未核验累计实际收费。来源：https://foci.family/documentation/fees' },
    security: { score: 4, applicable: true, noteEn: 'Compiler-emitted ABIs, contract addresses, fee controls, and claim rules are public; no independent audit was verified. Source: https://foci.family/documentation/abi', noteZh: '公开了编译生成的 ABI、合约地址、费用控制和领取规则；本次未核验到独立审计。来源：https://foci.family/documentation/abi' },
    ecosystem: { score: 4, applicable: true, noteEn: 'Permissionless Arc launches and opt-in holder rewards add composable token distribution primitives. Source: https://foci.family/documentation/fees', noteZh: '无许可 Arc 代币发行与可选持币者奖励机制，为生态提供可组合的代币分发能力。来源：https://foci.family/documentation/fees' },
  },
  faze: {
    delivery: { score: 4, applicable: true, noteEn: 'The beta terminal, launch flow, contract addresses, and public SDK are documented. Source: https://faze.fun/sdk', noteZh: 'Beta 交易终端、发行流程、合约地址和公开 SDK 均有文档说明。来源：https://faze.fun/sdk' },
    adoption: { score: 3, applicable: true, noteEn: 'Public token, trade, holder, and launch feeds exist, but comparable independent usage totals were not verified. Source: https://faze.fun/sdk', noteZh: '已提供公开代币、交易、持有人和发行信息接口，但本次未核验到可比较的独立使用总量。来源：https://faze.fun/sdk' },
    economics: { score: 2, applicable: true, noteEn: 'Contract-enforced fee configuration is exposed through the SDK, but realized platform fee totals were not verified. Source: https://faze.fun/sdk', noteZh: 'SDK 可查询合约执行的费用配置，但本次未核验到平台实际费用总额。来源：https://faze.fun/sdk' },
    security: { score: 3, applicable: true, noteEn: 'Contract state is publicly readable and the SDK is non-custodial; no independent audit was verified. Source: https://faze.fun/docs', noteZh: '合约状态可公开读取，SDK 采用非托管方式；本次未核验到独立审计。来源：https://faze.fun/docs' },
    ecosystem: { score: 4, applicable: true, noteEn: 'A live Arc launchpad and trading terminal with public data interfaces and an open integration SDK. Source: https://faze.fun/sdk', noteZh: '提供 Arc 发行平台、交易终端、公开数据接口及开放集成 SDK。来源：https://faze.fun/sdk' },
  },
  murmur: {
    delivery: { score: 4, applicable: true, noteEn: 'The autonomous-agent economy, x402 settlement, public API, and verifiable neural proofs are live. Source: https://muros.live/developers', noteZh: '自主智能体经济、x402 结算、公共 API 和可验证神经证明均已上线。来源：https://muros.live/developers' },
    adoption: { score: 4, applicable: true, noteEn: 'The public API reports a live population of 24 agents and exposes economy and deal activity; activity was not independently sampled here. Source: https://muros.live/developers', noteZh: '公共 API 报告有 24 个运行中的智能体，并开放经济与交易活动数据；本次未独立抽样核对活动量。来源：https://muros.live/developers' },
    economics: { score: 3, applicable: true, noteEn: 'Real USDC settlement and a paid x402 signal endpoint are documented, but aggregate payment volume was not verified. Source: https://muros.live/developers', noteZh: '已披露真实 USDC 结算和付费 x402 信号接口，但本次未核验累计支付量。来源：https://muros.live/developers' },
    security: { score: 4, applicable: true, noteEn: 'Manifest replay and receipt verification provide public provenance checks; these are not a substitute for a security audit. Source: https://muros.live/developers', noteZh: 'Manifest 重放与收据验证提供公开溯源校验；这些机制不等同于安全审计。来源：https://muros.live/developers' },
    ecosystem: { score: 4, applicable: true, noteEn: 'Uses Arc for autonomous USDC settlement and exposes open APIs for integrations. Source: https://muros.live/developers', noteZh: '使用 Arc 完成自主 USDC 结算，并提供开放 API 供生态集成。来源：https://muros.live/developers' },
  },
  vialiq: {
    delivery: { score: 4, applicable: true, noteEn: 'The live aggregator includes route comparison, portfolio views, public APIs, and an MCP integration. Source: https://vialiq.xyz/docs', noteZh: '聚合器已上线，提供路径比较、资产组合视图、公共 API 和 MCP 集成。来源：https://vialiq.xyz/docs' },
    adoption: { score: 3, applicable: true, noteEn: 'Public pool and quote endpoints are available, but aggregate routed volume and unique users were not verified. Source: https://vialiq.xyz/docs', noteZh: '已提供公开流动性池和报价接口，但本次未核验累计路由交易量与独立用户数。来源：https://vialiq.xyz/docs' },
    economics: { score: 2, applicable: true, noteEn: 'The docs publish a 0.50% output-token fee, but realized fees or routed volume were not verified. Source: https://vialiq.xyz/docs', noteZh: '文档披露 0.50% 输出代币费用，但本次未核验实际收费或路由交易量。来源：https://vialiq.xyz/docs' },
    security: { score: 4, applicable: true, noteEn: 'The app does not custody or sign user keys, and public APIs document unsigned transaction construction; no audit was verified. Source: https://vialiq.xyz/docs', noteZh: '应用不托管或签署用户密钥，公共 API 提供未签名交易构建；本次未核验到独立审计。来源：https://vialiq.xyz/docs' },
    ecosystem: { score: 4, applicable: true, noteEn: 'Adds reusable swap routing and agent-facing integration tools for Arc applications. Source: https://vialiq.xyz/docs', noteZh: '为 Arc 应用提供可复用兑换路由与面向智能体的集成工具。来源：https://vialiq.xyz/docs' },
  },
};
