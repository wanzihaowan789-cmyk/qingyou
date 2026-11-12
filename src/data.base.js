// 青柚学伴 · 内置数据（由题库 JSON 自动合并生成，勿手改）
// 题数：43  卡片：3  考点：12
window.QY_DATA = {
 "version": 1,
 "knowledge": [
  {
   "id": "K1.1",
   "name": "集合的表示与元素特性",
   "chapter": "集合",
   "weight": 1
  },
  {
   "id": "K1.2",
   "name": "集合间的基本关系",
   "chapter": "集合",
   "weight": 2
  },
  {
   "id": "K1.3",
   "name": "集合的运算",
   "chapter": "集合",
   "weight": 3
  },
  {
   "id": "K1.4",
   "name": "区间表示法",
   "chapter": "集合",
   "weight": 3
  },
  {
   "id": "K1.5",
   "name": "充分条件与必要条件",
   "chapter": "逻辑",
   "weight": 2
  },
  {
   "id": "K3.1",
   "name": "函数的概念",
   "chapter": "函数",
   "weight": 2
  },
  {
   "id": "K3.2",
   "name": "定义域",
   "chapter": "函数",
   "weight": 3
  },
  {
   "id": "K3.3",
   "name": "值域",
   "chapter": "函数",
   "weight": 3
  },
  {
   "id": "K3.4",
   "name": "函数的表示法",
   "chapter": "函数",
   "weight": 1
  },
  {
   "id": "K3.5",
   "name": "单调性",
   "chapter": "函数",
   "weight": 3
  },
  {
   "id": "K3.6",
   "name": "奇偶性",
   "chapter": "函数",
   "weight": 2
  },
  {
   "id": "K3.7",
   "name": "幂函数",
   "chapter": "函数",
   "weight": 1
  }
 ],
 "cards": [
  {
   "id": "c_domain",
   "kpId": "K3.2",
   "title": "定义域为什么这么定",
   "oneLine": "定义域就是「这个式子能算出来」的 x 的全体。",
   "whereFrom": "函数是两个集合之间的对应，先有 x 的取值范围，才谈得上 f(x)。所以定义域不是题目附赠的条件，它是函数本身的一部分——同一个解析式，定义域不同，就是两个不同的函数。",
   "points": [
    "分母 ≠ 0",
    "偶次根号下 ≥ 0",
    "对数真数 > 0（本阶段不考，但要知道有它）"
   ],
   "trap": "把 f(x)=x² 和 f(x)=x², x∈[0,2] 当成同一个函数。",
   "check": {
    "q": "f(x)=1/(x−2) 的定义域是？",
    "a": "x≠2"
   }
  },
  {
   "id": "c_range",
   "kpId": "K3.3",
   "title": "值域不是「能取到的最大最小值」",
   "oneLine": "值域是所有 f(x) 的集合，不只是最大最小两个数。",
   "whereFrom": "定义域是输入能取什么，值域是输出会落哪。求值域本质是问：x 跑遍定义域时，f(x) 会铺满哪一段。",
   "points": [
    "先定定义域，再求值域（顺序不能反）",
    "一次函数：端点代入",
    "二次函数：顶点 + 端点，看对称轴在不在区间内"
   ],
   "trap": "忘了先看定义域，直接用顶点算，结果区间外的点也算进去了。",
   "check": {
    "q": "f(x)=x², x∈[1,3] 的值域是？",
    "a": "[1,9]"
   }
  },
  {
   "id": "c_mono",
   "kpId": "K3.5",
   "title": "单调性是「往哪边走」的问题",
   "oneLine": "x 变大时 f(x) 一直变大，就叫增函数。",
   "whereFrom": "单调性不是背「同增异减」，它是把图象的走向翻译成代数语言：任取 x₁<x₂，比较 f(x₁) 与 f(x₂)。所以判断单调性只有一条路——作差。",
   "points": [
    "必须在区间上说单调，不能对整个定义域说",
    "作差 → 变形 → 定号",
    "二次函数看对称轴：a>0 时轴左减右增"
   ],
   "trap": "y=1/x 说它整个定义域上递减——错，它在 (−∞,0) 和 (0,+∞) 上分别递减。",
   "check": {
    "q": "f(x)=x²−2x 在哪个区间递增？",
    "a": "[1,+∞)"
   }
  }
 ],
 "items": [
  {
   "id": "q_0001",
   "kpId": "K1.4",
   "type": "fill",
   "difficulty": 1,
   "stem": "用区间表示集合 {x | 1 < x ≤ 3}",
   "answer": "(1,3]",
   "explain": "左端不含用圆括号，右端含用方括号",
   "distractors": {
    "[1,3]": "L0 分不清开闭",
    "(1,3)": "L0 漏了端点可含"
   },
   "source": "self"
  },
  {
   "id": "q_0002",
   "kpId": "K1.4",
   "type": "fill",
   "difficulty": 1,
   "stem": "用区间表示集合 {x | x ≥ −2}",
   "answer": "[−2,+∞)",
   "explain": "含端点用方括号，无穷一侧永远圆括号",
   "distractors": {
    "[−2,+∞]": "L0 无穷用方括号",
    "(−2,+∞)": "L2 端点写反"
   },
   "source": "self"
  },
  {
   "id": "q_0003",
   "kpId": "K1.4",
   "type": "choice",
   "difficulty": 1,
   "stem": "下列区间与集合 {x | −1 < x ≤ 2} 相等的是（ ）",
   "options": [
    "[−1,2]",
    "(−1,2]",
    "(−1,2)",
    "[−1,2)"
   ],
   "answer": "B",
   "explain": "左开右闭",
   "distractors": {
    "A": "L0 开闭不分",
    "C": "L3 看漏右端",
    "D": "L3 看反左右"
   },
   "source": "self"
  },
  {
   "id": "q_0004",
   "kpId": "K1.4",
   "type": "fill",
   "difficulty": 2,
   "stem": "A={x | 0 < x < 5}，B={x | 2 ≤ x ≤ 8}，求 A∩B",
   "answer": "[2,5)",
   "explain": "取公共部分：左端 2（B 含），右端 5（A 不含）",
   "distractors": {
    "(2,5)": "L3 漏了 B 的含端点",
    "[2,5]": "L0 开闭不分"
   },
   "source": "self"
  },
  {
   "id": "q_0005",
   "kpId": "K3.2",
   "type": "fill",
   "difficulty": 1,
   "stem": "函数 f(x)=1/(x−3) 的定义域",
   "answer": "{x | x ≠ 3}",
   "explain": "分母不能为 0",
   "distractors": {
    "x>3": "L0 把分母限制误解成单调区间"
   },
   "source": "self"
  },
  {
   "id": "q_0006",
   "kpId": "K3.2",
   "type": "fill",
   "difficulty": 1,
   "stem": "函数 f(x)=√(2x−6) 的定义域",
   "answer": "[3,+∞)",
   "explain": "偶次根号下 ≥0：2x−6≥0",
   "distractors": {
    "(3,+∞)": "L0 根号下可以等于 0",
    "x≥6": "L2 解不等式算错"
   },
   "source": "self"
  },
  {
   "id": "q_0007",
   "kpId": "K3.2",
   "type": "fill",
   "difficulty": 2,
   "stem": "函数 f(x)=√(x+1)/(x−2) 的定义域",
   "answer": "[−1,2)∪(2,+∞)",
   "explain": "根号要求 x≥−1，分母要求 x≠2，两个条件取交集",
   "distractors": {
    "x≥−1": "L3 漏了分母条件",
    "x≠2": "L3 漏了根号条件"
   },
   "source": "self"
  },
  {
   "id": "q_0008",
   "kpId": "K3.2",
   "type": "fill",
   "difficulty": 2,
   "stem": "函数 f(x)=√(4−x²) 的定义域",
   "answer": "[−2,2]",
   "explain": "4−x²≥0 → x²≤4 → −2≤x≤2",
   "distractors": {
    "x≤2": "L2 开方时漏了负半轴",
    "[0,2]": "L2 只算了正根"
   },
   "source": "self"
  },
  {
   "id": "q_0009",
   "kpId": "K3.2",
   "type": "fill",
   "difficulty": 2,
   "stem": "函数 f(x)=1/√(x−1) 的定义域",
   "answer": "(1,+∞)",
   "explain": "根号在分母上：既要 ≥0 又要 ≠0，故严格大于 0",
   "distractors": {
    "[1,+∞)": "L0 没意识到分母不能为 0"
   },
   "source": "self"
  },
  {
   "id": "q_0010",
   "kpId": "K3.2",
   "type": "fill",
   "difficulty": 3,
   "stem": "若 f(x) 的定义域为 [0,2]，求 f(x+1) 的定义域",
   "answer": "[−1,1]",
   "explain": "括号里整体要落在 [0,2]：0≤x+1≤2",
   "distractors": {
    "[1,3]": "L1 直接平移方向搞反",
    "[0,2]": "L0 没理解定义域是给谁的限制"
   },
   "source": "self"
  },
  {
   "id": "q_0011",
   "kpId": "K3.3",
   "type": "fill",
   "difficulty": 1,
   "stem": "f(x)=2x+1，x∈[0,3]，求值域",
   "answer": "[1,7]",
   "explain": "一次函数单调，端点代入",
   "distractors": {
    "[0,3]": "L0 把定义域当值域"
   },
   "source": "self"
  },
  {
   "id": "q_0012",
   "kpId": "K3.3",
   "type": "fill",
   "difficulty": 2,
   "stem": "f(x)=x²−4x+3，x∈R，求值域",
   "answer": "[−1,+∞)",
   "explain": "配方 (x−2)²−1，最小值 −1",
   "distractors": {
    "[3,+∞)": "L2 用常数项当最小值",
    "R": "L0 没意识到二次函数有下界"
   },
   "source": "self"
  },
  {
   "id": "q_0013",
   "kpId": "K3.3",
   "type": "fill",
   "difficulty": 2,
   "stem": "f(x)=x²−4x+3，x∈[0,3]，求值域",
   "answer": "[−1,3]",
   "explain": "对称轴 x=2 在区间内：最小值 f(2)=−1，端点 f(0)=3、f(3)=0，取最大 3",
   "distractors": {
    "[−1,0]": "L3 只看了右端点",
    "[3,0]": "L0 区间写法左右颠倒"
   },
   "source": "self"
  },
  {
   "id": "q_0014",
   "kpId": "K3.3",
   "type": "fill",
   "difficulty": 2,
   "stem": "f(x)=1/x，x∈[1,4]，求值域",
   "answer": "[1/4,1]",
   "explain": "在 [1,4] 上递减，故值域端点互换",
   "distractors": {
    "[1,4]": "L0 把定义域当值域",
    "未反向": "L1 忘了递减要反向"
   },
   "source": "self"
  },
  {
   "id": "q_0015",
   "kpId": "K3.3",
   "type": "fill",
   "difficulty": 3,
   "stem": "f(x)=x²+2x，x∈[−3,−1]，求值域",
   "answer": "[−1,3]",
   "explain": "对称轴 x=−1 恰在区间右端，故在区间上递减：f(−1)=−1 最小，f(−3)=3 最大",
   "distractors": {
    "[−3,−1]": "L0 把定义域当值域",
    "[0,3]": "L2 算成了 f(0)"
   },
   "source": "self"
  },
  {
   "id": "q_0016",
   "kpId": "K3.5",
   "type": "choice",
   "difficulty": 1,
   "stem": "函数 f(x)=−2x+3 在 R 上是（ ）",
   "options": [
    "增函数",
    "减函数",
    "先增后减",
    "不具备单调性"
   ],
   "answer": "B",
   "explain": "一次项系数为负 → 减函数",
   "distractors": {
    "A": "L0 只看常数项",
    "D": "L0 以为一次函数没单调性"
   },
   "source": "self"
  },
  {
   "id": "q_0017",
   "kpId": "K3.5",
   "type": "fill",
   "difficulty": 2,
   "stem": "f(x)=x²−2x 的单调递增区间",
   "answer": "[1,+∞)",
   "explain": "对称轴 x=1，开口向上，轴右侧递增",
   "distractors": {
    "(−∞,1]": "L1 左右记反",
    "R": "L0 以为整体递增"
   },
   "source": "self"
  },
  {
   "id": "q_0018",
   "kpId": "K3.5",
   "type": "solve",
   "difficulty": 2,
   "stem": "判断 f(x)=x³ 在 R 上的单调性，并说明理由",
   "answer": "增函数",
   "explain": "任取 x₁<x₂，f(x₁)−f(x₂)=x₁³−x₂³=(x₁−x₂)(x₁²+x₁x₂+x₂²)，后一项恒正，故差为负",
   "distractors": {
    "用求导": "L1 超纲，本阶段用定义作差"
   },
   "source": "self"
  },
  {
   "id": "q_0019",
   "kpId": "K3.6",
   "type": "choice",
   "difficulty": 1,
   "stem": "f(x)=x⁴+2x² 是（ ）",
   "options": [
    "奇函数",
    "偶函数",
    "既是奇又是偶",
    "非奇非偶"
   ],
   "answer": "B",
   "explain": "f(−x)=(−x)⁴+2(−x)²=x⁴+2x²=f(x)",
   "distractors": {
    "A": "L1 看错了符号",
    "D": "L0 没验证就下结论"
   },
   "source": "self"
  },
  {
   "id": "q_0020",
   "kpId": "K3.6",
   "type": "choice",
   "difficulty": 1,
   "stem": "f(x)=x³+x 是（ ）",
   "options": [
    "奇函数",
    "偶函数",
    "既是奇又是偶",
    "非奇非偶"
   ],
   "answer": "A",
   "explain": "f(−x)=−x³−x=−f(x)",
   "distractors": {
    "B": "L1 只看了幂次是奇数就以为是偶",
    "D": "L0 没验证"
   }
  },
  {
   "id": "q_0021",
   "kpId": "K1.2",
   "type": "fill",
   "difficulty": 1,
   "stem": "已知集合 A={1,2,3}，写出 A 的所有子集个数与真子集个数",
   "answer": "子集 8 个，真子集 7 个",
   "explain": "n 个元素集合的子集数 2ⁿ，真子集再减 1（去掉自身）",
   "source": "adapt:mock2026-hunan",
   "pattern": "考点01 集合间的基本关系 · 子集计数"
  },
  {
   "id": "q_0022",
   "kpId": "K1.2",
   "type": "fill",
   "difficulty": 2,
   "stem": "若 {1,2} ⊆ M ⊆ {1,2,3,4}，则满足条件的集合 M 有多少个？",
   "answer": "4 个",
   "explain": "M 必含 1、2，剩下 3、4 可各取或不取，2²=4",
   "source": "adapt:mock2026-hunan",
   "pattern": "考点01 · 夹逼型子集计数（二模高频）"
  },
  {
   "id": "q_0023",
   "kpId": "K1.2",
   "type": "choice",
   "difficulty": 2,
   "stem": "设 A={x | x²=1}，B={−1,1}，则 A 与 B 的关系是（ ）",
   "options": [
    "A⊂B",
    "B⊂A",
    "A=B",
    "A∩B=∅"
   ],
   "answer": "C",
   "explain": "解 x²=1 得 x=±1，两个集合元素完全相同",
   "distractors": {
    "A": "L2 解方程漏了负根",
    "B": "L2 同上"
   },
   "source": "adapt:mock2026-hunan",
   "pattern": "考点01 · 用方程的解构造集合再判关系"
  },
  {
   "id": "q_0024",
   "kpId": "K1.3",
   "type": "fill",
   "difficulty": 1,
   "stem": "A={1,2,3,4}，B={3,4,5}，求 A∩B 与 A∪B",
   "answer": "A∩B={3,4}，A∪B={1,2,3,4,5}",
   "explain": "交集取公共元素，并集取全部不重复",
   "source": "adapt:mock2026-hunan",
   "pattern": "考点02 集合的基本运算 · 列举法"
  },
  {
   "id": "q_0025",
   "kpId": "K1.3",
   "type": "fill",
   "difficulty": 2,
   "stem": "A={x | −1<x<3}，B={x | x≥1}，求 A∩B",
   "answer": "[1,3)",
   "explain": "公共部分：左端取 B 的 1，右端取 A 的 3（不含）",
   "distractors": {
    "(1,3)": "L3 漏了 B 的含端点",
    "[1,3]": "L0 开闭不分"
   },
   "source": "adapt:mock2026-hunan",
   "pattern": "考点02 · 区间法交集（二模标配）"
  },
  {
   "id": "q_0026",
   "kpId": "K1.3",
   "type": "fill",
   "difficulty": 2,
   "stem": "全集 U={1,2,3,4,5}，A={1,3,5}，求 ∁U A",
   "answer": "{2,4}",
   "explain": "补集 = 全集里不属于 A 的元素",
   "distractors": {
    "{1,3,5}": "L0 把补集当原集合"
   },
   "source": "adapt:mock2026-hunan",
   "pattern": "考点02 · 补集运算"
  },
  {
   "id": "q_0027",
   "kpId": "K1.2",
   "type": "choice",
   "difficulty": 2,
   "stem": "若 A ⊆ B，则下列一定成立的是（ ）",
   "options": [
    "A∩B=A",
    "A∩B=B",
    "A∪B=A",
    "A=B"
   ],
   "answer": "A",
   "explain": "A 全在 B 里，公共部分就是 A 自身",
   "distractors": {
    "B": "L0 交集并集搞反",
    "C": "L0 同上"
   },
   "source": "adapt:mock2026-hunan",
   "pattern": "考点01 · 子集与运算的等价关系"
  },
  {
   "id": "q_0028",
   "kpId": "K1.3",
   "type": "fill",
   "difficulty": 2,
   "stem": "A={x | x²−3x+2=0}，B={1,2,3}，求 A∩B 与 A∪B",
   "answer": "A∩B={1,2}，A∪B={1,2,3}",
   "explain": "先解方程得 A={1,2}，再做交并",
   "distractors": {
    "A=B": "L2 解方程错",
    "遗漏 2": "L2 因式分解漏根"
   },
   "source": "adapt:mock2026-hunan",
   "pattern": "考点02 · 方程解集与列举集合并算（二模常见组合）"
  },
  {
   "id": "q_0029",
   "kpId": "K1.3",
   "skill": "解一元二次不等式",
   "type": "fill",
   "difficulty": 1,
   "stem": "解不等式 x²−2x−3<0，并用区间表示解集",
   "answer": "(−1,3)",
   "explain": "因式分解 (x−3)(x+1)<0，两根之间取解",
   "source": "adapt:mock2026-hunan",
   "from": "专题01 考点01-1（原题直接给不等式解集让人判断元素归属）"
  },
  {
   "id": "q_0030",
   "kpId": "K1.3",
   "skill": "判断元素是否属于集合",
   "type": "choice",
   "difficulty": 1,
   "stem": "已知集合 M={x | −1<x<3}，则下列正确的是（ ）",
   "options": [
    "3∈M",
    "−1∈M",
    "2∈M",
    "4∈M"
   ],
   "answer": "C",
   "explain": "端点不含，1<2<3 在区间内",
   "distractors": {
    "A": "L0 开闭不分",
    "B": "L0 同上"
   },
   "source": "adapt:mock2026-hunan",
   "from": "专题01 考点01-1"
  },
  {
   "id": "q_0031",
   "kpId": "K1.3",
   "skill": "解绝对值不等式",
   "type": "fill",
   "difficulty": 2,
   "stem": "解不等式 |x−2|<2，并用区间表示",
   "answer": "(0,4)",
   "explain": "−2<x−2<2，两边加 2 得 0<x<4",
   "source": "adapt:mock2026-hunan",
   "from": "专题01 考点02-2"
  },
  {
   "id": "q_0032",
   "kpId": "K1.2",
   "skill": "子集与参数范围",
   "type": "fill",
   "difficulty": 2,
   "stem": "A={x | x>a}，B={x | 1<x<3}，若 B⊆A，求 a 的取值范围",
   "answer": "a≤1",
   "explain": "B 的所有元素都要大于 a，故 a 不能超过 1（可以等于 1，因为 B 不含 1）",
   "distractors": {
    "a<1": "L3 忽略了端点可以取等",
    "a≥3": "L1 方向搞反"
   },
   "source": "adapt:mock2026-hunan",
   "from": "专题01 考点01-2（原题用 A∪B=A 反推 a）"
  },
  {
   "id": "q_0033",
   "kpId": "K1.2",
   "skill": "A∪B=A 的等价改写",
   "type": "choice",
   "difficulty": 2,
   "stem": "若 A∪B=A，则下列一定成立的是（ ）",
   "options": [
    "B⊆A",
    "A⊆B",
    "A=B",
    "A∩B=∅"
   ],
   "answer": "A",
   "explain": "并起来还是 A，说明 B 没带来新元素，B 全在 A 里",
   "distractors": {
    "B": "L0 包含方向搞反",
    "C": "L0 把包含当相等"
   },
   "source": "adapt:mock2026-hunan",
   "from": "专题01 考点01-2"
  },
  {
   "id": "q_0034",
   "kpId": "K1.3",
   "skill": "补集运算",
   "type": "fill",
   "difficulty": 2,
   "stem": "全集 U={1,2,3,4,5,6,7,8}，A={3,4,5,6}，求 ∁U A",
   "answer": "{1,2,7,8}",
   "explain": "全集里不属于 A 的元素",
   "source": "adapt:mock2026-hunan",
   "from": "专题01 考点01-4（原题全集用 N*）"
  },
  {
   "id": "q_0035",
   "kpId": "K1.3",
   "skill": "整数集与绝对值不等式",
   "type": "fill",
   "difficulty": 2,
   "stem": "把集合 {x∈Z | |x|≤3} 用列举法写出来，并求元素个数",
   "answer": "{−3,−2,−1,0,1,2,3}，共 7 个",
   "explain": "|x|≤3 即 −3≤x≤3，取整数",
   "distractors": {
    "6 个": "L2 漏了 0",
    "只取正数": "L0 忘了负整数"
   },
   "source": "adapt:mock2026-hunan",
   "from": "专题01 考点01-3"
  },
  {
   "id": "q_0036",
   "kpId": "K1.3",
   "skill": "并集与计数",
   "type": "fill",
   "difficulty": 2,
   "stem": "A={x∈Z | |x|≤3}，B={2,3,4}，求 A∪B 的元素个数",
   "answer": "8",
   "explain": "A 有 7 个元素，B 新增 4，共 8 个",
   "distractors": {
    "7": "L3 忘了并入新元素",
    "9": "L2 重复计了 2、3"
   },
   "source": "adapt:mock2026-hunan",
   "from": "专题01 考点01-3"
  },
  {
   "id": "q_0037",
   "kpId": "K1.2",
   "skill": "子集个数公式",
   "type": "fill",
   "difficulty": 1,
   "stem": "集合 {a,b,c} 的子集个数和真子集个数分别是多少？",
   "answer": "8 个和 7 个",
   "explain": "2³=8，真子集去掉自身",
   "source": "adapt:mock2026-hunan",
   "from": "专题01 考点01 常用设问"
  },
  {
   "id": "q_0038",
   "kpId": "K1.3",
   "skill": "平方非负的陷阱",
   "type": "choice",
   "difficulty": 2,
   "stem": "不等式 (x−1)²>0 的解集是（ ）",
   "options": [
    "x≠1",
    "x>1",
    "x<1",
    "R"
   ],
   "answer": "A",
   "explain": "平方恒非负，只要不为 0 就大于 0",
   "distractors": {
    "D": "L0 以为平方总为正",
    "B": "L1 把平方当了一次式"
   },
   "source": "adapt:mock2026-hunan",
   "from": "专题01 考点02-1"
  },
  {
   "id": "q_0039",
   "kpId": "K1.3",
   "skill": "两个区间的交集",
   "type": "fill",
   "difficulty": 1,
   "stem": "M={x | x<4}，N={x | x>−1}，求 M∩N",
   "answer": "(−1,4)",
   "explain": "两边取较紧的端点",
   "source": "adapt:mock2026-hunan",
   "from": "专题01 考点02-4"
  },
  {
   "id": "q_0040",
   "kpId": "K3.2",
   "skill": "根号型定义域",
   "type": "fill",
   "difficulty": 1,
   "stem": "函数 f(x)=√(2−x) 的定义域",
   "answer": "(−∞,2]",
   "explain": "2−x≥0",
   "distractors": {
    "[2,+∞)": "L2 变号错",
    "(−∞,2)": "L0 根号下可以取 0"
   },
   "source": "adapt:mock2026-hunan",
   "from": "专题01 考点02-4（原题用 ln(x+1)，超纲改为根号）"
  },
  {
   "id": "q_0041",
   "kpId": "K1.5",
   "skill": "充分条件的判断",
   "type": "choice",
   "difficulty": 2,
   "stem": "「x>1」是「x²>1」的（ ）",
   "options": [
    "充分不必要条件",
    "必要不充分条件",
    "充要条件",
    "既不充分也不必要"
   ],
   "answer": "A",
   "explain": "x>1 一定能推出 x²>1；反过来 x<−1 也满足 x²>1，推不出 x>1",
   "distractors": {
    "C": "L1 只验了单向",
    "D": "L0 没举反例"
   },
   "source": "adapt:mock2026-hunan",
   "from": "专题01 考点03"
  },
  {
   "id": "q_0042",
   "kpId": "K1.5",
   "skill": "必要条件的判断",
   "type": "choice",
   "difficulty": 2,
   "stem": "「x²>1」是「x>1」的（ ）",
   "options": [
    "充分不必要条件",
    "必要不充分条件",
    "充要条件",
    "既不充分也不必要"
   ],
   "answer": "B",
   "explain": "x>1 必然 x²>1，但 x²>1 不一定 x>1，故前者是后者的必要条件",
   "distractors": {
    "A": "L1 充分必要方向搞反"
   },
   "source": "adapt:mock2026-hunan",
   "from": "专题01 考点03"
  },
  {
   "id": "q_0043",
   "kpId": "K1.5",
   "skill": "充要条件的判断",
   "type": "choice",
   "difficulty": 1,
   "stem": "「x=0」是「x²=0」的（ ）",
   "options": [
    "充分不必要条件",
    "必要不充分条件",
    "充要条件",
    "既不充分也不必要"
   ],
   "answer": "C",
   "explain": "两边互推，等价",
   "source": "adapt:mock2026-hunan",
   "from": "专题01 考点03"
  }
 ]
};
