export type GroupId = "place" | "dish" | "shop" | "ingredient";

export type GraphNode = {
  id: string;
  label: string;
  group: GroupId;
  summary: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  label: string;
};

export const GROUPS: Record<
  GroupId,
  { label: string; shape: "round" | "circle" | "ring" | "diamond" }
> = {
  place: { label: "장소", shape: "round" },
  dish: { label: "음식", shape: "circle" },
  shop: { label: "가게", shape: "ring" },
  ingredient: { label: "재료", shape: "diamond" },
};

export const NODES: GraphNode[] = [
  { id: "seoul-station", label: "서울역", group: "place", summary: "기차와 환승이 겹치는 관문. 빠른 한 끼가 플랫폼 쪽으로 몰린다." },
  { id: "euljiro", label: "을지로", group: "place", summary: "인쇄 골목과 노포가 같은 블록에 남아 있는 도심." },
  { id: "gwangjang", label: "광장시장", group: "place", summary: "빈대떡과 육회가 통로를 채우는 서울의 큰 장." },
  { id: "namdaemun", label: "남대문시장", group: "place", summary: "호떡과 칼국수로 오래 불린 시장." },
  { id: "mangwon", label: "망원시장", group: "place", summary: "골목이 좁고 칼국수 집이 많은 서쪽 시장." },
  { id: "seongsu", label: "성수", group: "place", summary: "공장 골목이 카페와 계절 음식으로 바뀐 동네." },
  { id: "ikseon", label: "익선동", group: "place", summary: "한옥 처마 아래 작은 집이 모여 있는 골목." },
  { id: "yeonnam", label: "연남동", group: "place", summary: "경의선 숲길에서 한 블록 들어간 고기 골목." },
  { id: "jongno", label: "종로", group: "place", summary: "냉면과 보쌈이 오래된 중심 거리." },
  { id: "yaksu", label: "약수", group: "place", summary: "갈비탕 집이 언덕을 따라 늘어선 동네." },

  { id: "donkatsu", label: "돈카츠", group: "dish", summary: "돼지고기 등심을 튀김옷에 입혀 두껍게 지진 커틀릿." },
  { id: "curry-udon", label: "카레우동", group: "dish", summary: "우동에 카레를 얹는 한 끼. 돈카츠와 세트로 자주 나온다." },
  { id: "naengmyeon", label: "평양냉면", group: "dish", summary: "메밀국수에 차가운 육수를 부은 면. 종로 노포가 기준으로 통한다." },
  { id: "tteokbokki", label: "떡볶이", group: "dish", summary: "쌀떡을 고추장 양념에 조린 분식의 중심." },
  { id: "sundae", label: "순대", group: "dish", summary: "당면을 넣은 떡 피를 삶아, 떡볶이와 같이 낸다." },
  { id: "kalguksu", label: "칼국수", group: "dish", summary: "밀가루 반죽을 칼로 썬 면. 사골 국물에 만다." },
  { id: "kongguksu", label: "콩국수", group: "dish", summary: "갈아 낸 콩물에 밀국수를 말아 여름에 먹는다." },
  { id: "bossam", label: "보쌈", group: "dish", summary: "삶아 낸 돼지고기를 배추와 김치에 싸 먹는 상." },
  { id: "samgyeopsal", label: "삼겹살", group: "dish", summary: "구워 먹는 돼지고기. 막걸리와 붙는 경우가 많다." },
  { id: "makgeolli", label: "막걸리", group: "dish", summary: "누룩으로 발효한 탁주." },
  { id: "hotteok", label: "호떡", group: "dish", summary: "밀가루 반죽에 속을 넣어 기름에 누르는 시장 빵." },
  { id: "bindaetteok", label: "빈대떡", group: "dish", summary: "녹두를 갈아 부친 전. 광장시장의 대표 맛." },
  { id: "yukhoe", label: "육회", group: "dish", summary: "양념한 생소고기. 시장에서 바로 떠 준다." },
  { id: "galbitang", label: "갈비탕", group: "dish", summary: "소갈비와 사골을 오래 고은 국." },
  { id: "gimbap", label: "김밥", group: "dish", summary: "밥과 속을 김에 만 도시락. 역에서 빨리 사 먹기 좋다." },
  { id: "kimchi-jjigae", label: "김치찌개", group: "dish", summary: "신 김치와 돼지고기를 고추와 함께 끓인 찌개." },

  { id: "shop-katsu", label: "역전돈까스", group: "shop", summary: "예시로 둔 가게. 서울역에서 돈카츠와 카레 세트를 낸다." },
  { id: "shop-udon", label: "인쇄골목우동", group: "shop", summary: "예시로 둔 가게. 인쇄소 사이 골목에서 우동과 찌개를 낸다." },
  { id: "shop-naeng", label: "종로냉면옥", group: "shop", summary: "예시로 둔 가게. 육수를 하루 전에 가라앉히는 냉면집." },
  { id: "shop-bindae", label: "광장빈대떡", group: "shop", summary: "예시로 둔 좌판. 녹두 전을 철판에서 바로 부친다." },
  { id: "shop-hotteok", label: "남문호떡", group: "shop", summary: "예시로 둔 노점. 시장 입구에서 호떡을 누른다." },
  { id: "shop-kal", label: "망원칼국수", group: "shop", summary: "예시로 둔 가게. 사골 국물에 칼국수를 만다." },
  { id: "shop-kong", label: "성수콩국", group: "shop", summary: "예시로 둔 가게. 여름에만 콩국수를 낸다." },
  { id: "shop-tea", label: "익선다실", group: "shop", summary: "예시로 둔 다실. 한옥 창으로 차를 내는 작은 집." },
  { id: "shop-meat", label: "연남고기", group: "shop", summary: "예시로 둔 가게. 골목으로 연기가 빠지는 삼겹살 집." },
  { id: "shop-galbi", label: "약수갈비", group: "shop", summary: "예시로 둔 가게. 갈비를 오래 고아 국으로 낸다." },
  { id: "shop-bossam", label: "종로보쌈", group: "shop", summary: "예시로 둔 가게. 저녁에 수육과 김치를 낸다." },
  { id: "shop-gimbap", label: "역전김밥", group: "shop", summary: "예시로 둔 가게. 줄 서는 시간이 짧은 역전 김밥." },
  { id: "shop-tteok", label: "을지분식", group: "shop", summary: "예시로 둔 분식. 떡볶이와 순대를 한 그릇에 담는다." },
  { id: "shop-yukhoe", label: "광장육회", group: "shop", summary: "예시로 둔 좌판. 장을 보자마자 육회를 썬다." },

  { id: "kimchi", label: "김치", group: "ingredient", summary: "배추를 고춧가루와 절여 익힌 반찬. 찌개와 보쌈의 바탕." },
  { id: "pork", label: "돼지고기", group: "ingredient", summary: "돈카츠, 보쌈, 삼겹살, 찌개를 가로지르는 재료." },
  { id: "beef", label: "소고기", group: "ingredient", summary: "육회와 갈비탕의 중심 고기." },
  { id: "buckwheat", label: "메밀", group: "ingredient", summary: "평양냉면 면의 알맹이." },
  { id: "flour", label: "밀가루", group: "ingredient", summary: "칼국수, 튀김옷, 호떡 반죽으로 퍼지는 가루." },
  { id: "ricecake", label: "쌀떡", group: "ingredient", summary: "떡볶이 떡과 순대 피." },
  { id: "soybean", label: "콩", group: "ingredient", summary: "콩국수의 하얀 국물." },
  { id: "cabbage", label: "배추", group: "ingredient", summary: "김치와 보쌈 쌈의 잎." },
  { id: "broth", label: "사골", group: "ingredient", summary: "냉면과 칼국수, 갈비탕이 나눠 쓰는 깊은 육수." },
  { id: "nuruk", label: "누룩", group: "ingredient", summary: "막걸리를 발효시키는 곰팡이 떡." },
  { id: "gochugaru", label: "고춧가루", group: "ingredient", summary: "떡볶이 양념과 김치, 찌개의 붉은 맛." },
  { id: "mung", label: "녹두", group: "ingredient", summary: "빈대떡의 껍질을 벗겨 간 알맹이." },
];

const RAW_EDGES: ReadonlyArray<readonly [string, string, string]> = [
  ["seoul-station", "namdaemun", "인근"],
  ["seoul-station", "euljiro", "인근"],
  ["euljiro", "jongno", "인근"],
  ["euljiro", "gwangjang", "인근"],
  ["jongno", "gwangjang", "인근"],
  ["jongno", "ikseon", "인근"],
  ["euljiro", "yaksu", "인근"],
  ["mangwon", "yeonnam", "인근"],
  ["seongsu", "euljiro", "2호선"],
  ["namdaemun", "jongno", "인근"],

  ["seoul-station", "shop-katsu", "자리"],
  ["seoul-station", "shop-gimbap", "자리"],
  ["euljiro", "shop-udon", "자리"],
  ["euljiro", "shop-tteok", "자리"],
  ["jongno", "shop-naeng", "자리"],
  ["jongno", "shop-bossam", "자리"],
  ["gwangjang", "shop-bindae", "자리"],
  ["gwangjang", "shop-yukhoe", "자리"],
  ["namdaemun", "shop-hotteok", "자리"],
  ["mangwon", "shop-kal", "자리"],
  ["seongsu", "shop-kong", "자리"],
  ["ikseon", "shop-tea", "자리"],
  ["yeonnam", "shop-meat", "자리"],
  ["yaksu", "shop-galbi", "자리"],

  ["shop-katsu", "donkatsu", "메뉴"],
  ["shop-katsu", "curry-udon", "세트"],
  ["shop-udon", "curry-udon", "메뉴"],
  ["shop-udon", "kimchi-jjigae", "메뉴"],
  ["shop-naeng", "naengmyeon", "메뉴"],
  ["shop-bossam", "bossam", "메뉴"],
  ["shop-bossam", "kimchi-jjigae", "곁들임"],
  ["shop-bindae", "bindaetteok", "메뉴"],
  ["shop-yukhoe", "yukhoe", "메뉴"],
  ["shop-hotteok", "hotteok", "메뉴"],
  ["shop-kal", "kalguksu", "메뉴"],
  ["shop-kong", "kongguksu", "메뉴"],
  ["shop-tea", "shop-bossam", "골목"],
  ["shop-meat", "samgyeopsal", "메뉴"],
  ["shop-meat", "makgeolli", "페어링"],
  ["shop-galbi", "galbitang", "메뉴"],
  ["shop-gimbap", "gimbap", "메뉴"],
  ["shop-tteok", "tteokbokki", "메뉴"],
  ["shop-tteok", "sundae", "메뉴"],

  ["gwangjang", "bindaetteok", "대표"],
  ["gwangjang", "yukhoe", "대표"],
  ["namdaemun", "hotteok", "대표"],
  ["namdaemun", "kalguksu", "대표"],
  ["jongno", "naengmyeon", "대표"],
  ["jongno", "bossam", "대표"],
  ["seoul-station", "gimbap", "대표"],
  ["seoul-station", "donkatsu", "대표"],
  ["seongsu", "kongguksu", "계절"],
  ["mangwon", "kalguksu", "대표"],
  ["yaksu", "galbitang", "대표"],
  ["yeonnam", "samgyeopsal", "골목"],

  ["donkatsu", "pork", "재료"],
  ["donkatsu", "flour", "튀김옷"],
  ["curry-udon", "flour", "면"],
  ["curry-udon", "donkatsu", "세트"],
  ["kimchi-jjigae", "kimchi", "재료"],
  ["kimchi-jjigae", "pork", "재료"],
  ["kimchi-jjigae", "gochugaru", "재료"],
  ["naengmyeon", "buckwheat", "면"],
  ["naengmyeon", "broth", "육수"],
  ["tteokbokki", "ricecake", "재료"],
  ["tteokbokki", "gochugaru", "양념"],
  ["sundae", "ricecake", "피"],
  ["sundae", "tteokbokki", "페어링"],
  ["kalguksu", "flour", "면"],
  ["kalguksu", "broth", "육수"],
  ["kongguksu", "soybean", "재료"],
  ["kongguksu", "flour", "면"],
  ["bossam", "pork", "재료"],
  ["bossam", "cabbage", "쌈"],
  ["bossam", "kimchi", "곁들임"],
  ["bossam", "makgeolli", "페어링"],
  ["samgyeopsal", "pork", "재료"],
  ["samgyeopsal", "makgeolli", "페어링"],
  ["makgeolli", "nuruk", "발효"],
  ["hotteok", "flour", "반죽"],
  ["bindaetteok", "mung", "재료"],
  ["bindaetteok", "pork", "속"],
  ["yukhoe", "beef", "재료"],
  ["galbitang", "beef", "재료"],
  ["galbitang", "broth", "육수"],
  ["gimbap", "tteokbokki", "페어링"],
  ["kimchi", "cabbage", "재료"],
  ["kimchi", "gochugaru", "양념"],
];

export const EDGES: GraphEdge[] = RAW_EDGES.map(([source, target, label]) => ({
  source,
  target,
  label,
}));

const NODE_BY_ID = new Map(NODES.map((node) => [node.id, node]));

export function linksOf(id: string): { label: string; node: GraphNode }[] {
  const out: { label: string; node: GraphNode }[] = [];
  for (const edge of EDGES) {
    const otherId = edge.source === id ? edge.target : edge.target === id ? edge.source : null;
    if (!otherId) continue;
    const node = NODE_BY_ID.get(otherId);
    if (!node) continue;
    out.push({ label: edge.label, node });
  }
  out.sort(
    (a, b) => a.node.label.localeCompare(b.node.label, "ko") || a.label.localeCompare(b.label, "ko"),
  );
  return out;
}

export function searchNodes(query: string): GraphNode[] {
  const q = query.trim().toLocaleLowerCase("ko-KR");
  if (!q) return [];
  const related = new Set<string>();
  for (const edge of EDGES) {
    if (edge.label.toLocaleLowerCase("ko-KR").includes(q)) {
      related.add(edge.source);
      related.add(edge.target);
    }
  }
  const hits = NODES.filter((node) => {
    if (related.has(node.id)) return true;
    if (node.label.toLocaleLowerCase("ko-KR").includes(q)) return true;
    if (node.summary.toLocaleLowerCase("ko-KR").includes(q)) return true;
    if (GROUPS[node.group].label.toLocaleLowerCase("ko-KR").includes(q)) return true;
    return false;
  });
  hits.sort((a, b) => a.label.localeCompare(b.label, "ko"));
  return hits;
}
