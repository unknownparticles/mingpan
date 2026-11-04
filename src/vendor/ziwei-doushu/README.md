# 紫微斗数排盘核心

来源：https://github.com/Renhuai123/ziwei-doushu

固定版本：`a600484a49255039d0725f1ba9e11ca81a948f97`

引入 `lib/ziwei` 下的 algorithm、types、constants、school-data、school-tables.generated、school-config 六个模块，并引入 true-solar-time、dst-cn、clock-adjust、yunxian-context、patterns 和 classics 公版古籍选录，采用 MIT 许可（见 LICENSE）。未引入大规模解读数据集或倪师课程原话。

本地适配：相对导入添加 `.ts` 后缀，以支持 Node 原生回归测试。移除上游未使用的 `DaXianSiHua` 类型导入以通过严格编译。业务适配放在 `src/lib/ziwei.ts`，升级时保留本文件并更新版本号。

追加适配：移除 patterns 的 Next.js `server-only` 标记，使纯计算可在浏览器离线运行；移除未使用常量与类型导入，将未使用参数加下划线，以通过本项目严格编译。古籍数据保留选录形式，未当作全本交付。
