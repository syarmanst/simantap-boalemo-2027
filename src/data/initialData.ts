import { VillagePlanRecord } from '../types';
import { emptyUnsur } from '../utils/calculations';

export const RAW_BOALEMO_DATA = `
1,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012004,Bongo Nol,28/8/2024,10 Juni 2026,4,28,32,13,5,,,4,,,,,1,3,6,,,32,-,,15 Juni 2026,26 Juni 2026,9,32,41,13,5,,,5,5,,,,1,1,6,,6,42,-1,,,,,-,,,,,,,,,,,,,,,-,,,,,,,,,,,,,-,,,,,,,,,,,,,,,-,-,,,,,,
2,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012005,Bongo IV,15/7/2024,8/7/2026,7,25,32,10,5,,,2,3,,,,2,2,5,,,29,3,,19/6 /2026,8/7/2026,7,29,36,9,5,,,4,4,,,,2,1,4,,5,34,2,,,,,-,,,,,,,,,,,,,,,-,,,,,,,,,,,,,-,,,,,,,,,,,,,,,-,-,,,,,,
3,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012006,Molombulahe,23/9/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
4,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012007,Mutiara,26/10/2024,3/8/2026,5,32,37,9,5,,,3,5,,,,2,1,6,,,31,6,,7/11/2026,7/9/2026,8,35,43,10,5,,,4,6,,,,1,1,5,,3,35,8,,,,,-,,,,,,,,,,,,,,,-,,,,,,,,,,,,,-,,,,,,,,,,,,,,,-,-,,,,,,
5,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012008,Saripi,5/10/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
6,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012009,Wonggahu,21/8/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
7,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012010,Tangkobu,19/10/2021,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
8,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012011,Bongo Tua,23/8/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
9,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012012,Kuala Lumpur,29/8/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
10,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012013,Mustika,5/9/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
11,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012014,Tenilo,12/9/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
12,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012015,Huwongo,3/9/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
13,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012016,Karya Murni,15/3/2023,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
14,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012019,Girisa,30/9/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
15,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012020,Batu Kramat,23/9/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
16,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012021,Bualo,23/8/2021,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
17,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012022,Sosial,26/8/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
18,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012023,Permata,21/9/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
19,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012024,Hulawa,18/9/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
20,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012025,Balate Jaya,26/8/2024,7/2/2026,7,20,27,12,5,,3,2,,,,,2,1,2,,,27,-,,7/9/2026,7/14/2026,7,62,69,12,5,,24,10,10,,,,2,1,5,,,69,-,,,,,-,,,,,,,,,,,,,,,-,,,,,,,,,,,,,-,,,,,,,,,,,,,,,-,-,,,,,,
21,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012026,Rejonegoro,9/9/2024,23/07/2026,12,18,30,12,5,-,-,2,-,-,-,-,2,1,6,2,-,30,-,,8/3/2026,13/8/2026,27,35,62,13,5,-,14,4,15,-,-,-,3,2,6,-,-,62,-,,,,,-,,,,,,,,,,,,,,,-,,,,,,,,,,,,,-,,,,,,,,,,,,,,,-,-,,,,,,
22,75,Gorontalo,7502,Boalemo,750201,Paguyaman,7502012027,Diloato,7/7/2021,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
23,75,Gorontalo,7502,Boalemo,750202,Wonosari,7502022001,Harapan,9/26/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
24,75,Gorontalo,7502,Boalemo,750202,Wonosari,7502022002,Bongo II,4/3/2023,8/8/2026,14,15,29,13,4,-,1,1,2,-,-,-,1,2,4,1,,29,-,,13/8/2026,8/9/2026,18,26,44,16,4,-,5,2,2,-,-,1,2,2,6,4,,44,-,,,,,-,,,,,,,,,,,,,,,-,,,,,,,,,,,,,-,,,,,,,,,,,,,,,-,-,,,,,,
25,75,Gorontalo,7502,Boalemo,750202,Wonosari,7502022003,Bongo III,9/3/2025,03/09/2026,10,15,25,8,5,-,1,2,2,-,-,-,1,2,4,-,,25,-,,4/9/2026,16/09/2026,18,22,40,10,5,-,4,3,4,-,-,-,1,2,6,5,-,40,-,,,,,-,,,,,,,,,,,,,,,-,,,,,,,,,,,,,-,,,,,,,,,,,,,,,-,-,,,,,,
26,75,Gorontalo,7502,Boalemo,750202,Wonosari,7502022004,Mekarjaya,25/9/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
27,75,Gorontalo,7502,Boalemo,750202,Wonosari,7502022005,Sukamaju,26/9/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
28,75,Gorontalo,7502,Boalemo,750202,Wonosari,7502022006,Pangeya,18/07/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
29,75,Gorontalo,7502,Boalemo,750202,Wonosari,7502022007,Jatimulya,18/09/2021,1/9/2026,8,15,23,9,4,-,1,1,1,-,-,-,1,1,3,2,,23,-,,01/09/2026,8/9/2026,9,18,27,9,4,-,1,1,1,-,-,-,1,3,5,2,-,27,-,,,,,-,,,,,,,,,,,,,,,-,,,,,,,,,,,,,-,,,,,,,,,,,,,,,-,-,,,,,,
30,75,Gorontalo,7502,Boalemo,750202,Wonosari,7502022008,Suka Mulya,30/09/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
31,75,Gorontalo,7502,Boalemo,750202,Wonosari,7502022009,Sari Tani,26/09/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
32,75,Gorontalo,7502,Boalemo,750202,Wonosari,7502022010,Dimito,25/06/2023,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
33,75,Gorontalo,7502,Boalemo,750202,Wonosari,7502022011,Tanjung Harapan,17/05/2021,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
34,75,Gorontalo,7502,Boalemo,750202,Wonosari,7502022012,Raharja,20/09/2021,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
35,75,Gorontalo,7502,Boalemo,750202,Wonosari,7502022013,Trirukun,20/09/2021,1/8/2026,10,14,24,9,3,-,1,1,1,-,-,-,1,1,5,2,,24,-,,2/9/2026,10/9/2026,13,21,34,10,5,-,4,1,2,-,-,-,3,3,4,2,,34,-,,,,,-,,,,,,,,,,,,,,,-,,,,,,,,,,,,,-,,,,,,,,,,,,,,,-,-,,,,,,
36,75,Gorontalo,7502,Boalemo,750202,Wonosari,7502022014,Dulohupa,8/8/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,28,,,,,,,,,,,,,-,,,,,,,,,,,,,,,-,-,,,,,,
37,75,Gorontalo,7502,Boalemo,750203,Dulupi,7502032001,Dulupi,27/03/2023,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
38,75,Gorontalo,7502,Boalemo,750203,Dulupi,7502032002,Tabongo,1/10/2023,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
39,75,Gorontalo,7502,Boalemo,750203,Dulupi,7502032003,Kotaraja,20/08/2023,11/9/2026,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
40,75,Gorontalo,7502,Boalemo,750203,Dulupi,7502032004,Polohungo,18/01/2023,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
41,75,Gorontalo,7502,Boalemo,750203,Dulupi,7502032005,Pangi,14/10/2023,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
42,75,Gorontalo,7502,Boalemo,750203,Dulupi,7502032006,Tangga Jaya,9/12/2023,5/8/2026,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
43,75,Gorontalo,7502,Boalemo,750203,Dulupi,7502032007,Tanah Putih,30/03/2023,10/9/2026,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
44,75,Gorontalo,7502,Boalemo,750203,Dulupi,7502032008,Tangga Barito,12/10/2023,27/7/2026,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
45,75,Gorontalo,7502,Boalemo,750204,Tilamuta,7502042001,Limbato,28/03/2023,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
46,75,Gorontalo,7502,Boalemo,750204,Tilamuta,7502042002,Piloliyanga,4/2/2018,26/8/2026,15,28,43,12,5,,11,2,5,,,,2,2,2,2,,43,-,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
47,75,Gorontalo,7502,Boalemo,750204,Tilamuta,7502042003,Ayuhulalo,19/09/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
48,75,Gorontalo,7502,Boalemo,750204,Tilamuta,7502042004,Hungayonaa,27/09/2024,5/8/2026,16,30,46,10,9,,16,1,2,,,,1,2,2,3,,46,-,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
49,75,Gorontalo,7502,Boalemo,750204,Tilamuta,7502042005,Modelomo,5/11/2020,27/8/2026,17,22,39,12,7,,15,2,2,,,,,,,1,,39,-,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
50,75,Gorontalo,7502,Boalemo,750204,Tilamuta,7502042006,Pentadu Barat,21/10/2024,1/7/2026,15,30,45,10,7,,10,1,,10,,,1,,3,3,,45,-,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
51,75,Gorontalo,7502,Boalemo,750204,Tilamuta,7502042007,Pentadu Timur,7/6/2020,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
52,75,Gorontalo,7502,Boalemo,750204,Tilamuta,7502042008,Bajo,10/6/2023,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
53,75,Gorontalo,7502,Boalemo,750204,Tilamuta,7502042009,Mohungo,30/03/2023,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
54,75,Gorontalo,7502,Boalemo,750204,Tilamuta,7502042010,Lahumbo,6/3/2020,4/9/2026,12,32,44,9,7,,13,2,,5,,,1,1,3,3,,44,-,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
55,75,Gorontalo,7502,Boalemo,750204,Tilamuta,7502042011,Lamu,23/10/2024,12/8/2026,13,19,32,10,5,,16,,,,,,,,,1,,32,-,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
56,75,Gorontalo,7502,Boalemo,750204,Tilamuta,7502042018,Tenilo,30/09/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
57,75,Gorontalo,7502,Boalemo,750205,Mananggu,7502052001,Tabulo,9/9/2024,31/8/2026,11,17,28,10,4,,,7,2,,,,2,1,,2,,28,-,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
58,75,Gorontalo,7502,Boalemo,750205,Mananggu,7502052002,Kaaruyan,3/3/2020,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
59,75,Gorontalo,7502,Boalemo,750205,Mananggu,7502052003,Salilama,10/10/2024,1/9/2026,12,16,28,9,3,,2,4,5,,,,2,2,,1,,28,-,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
60,75,Gorontalo,7502,Boalemo,750205,Mananggu,7502052004,Bendungan,3/10/2020,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
61,75,Gorontalo,7502,Boalemo,750205,Mananggu,7502052005,Mananggu,9/5/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
62,75,Gorontalo,7502,Boalemo,750205,Mananggu,7502052006,Buti,10/2/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
63,75,Gorontalo,7502,Boalemo,750205,Mananggu,7502052007,Pontolo,10/2/2024,2/9/2026,20,27,47,10,5,,12,9,3,,,,2,2,1,3,,47,-,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
64,75,Gorontalo,7502,Boalemo,750205,Mananggu,7502052008,Kramat,3/10/2020,4/9/2026,14,37,51,9,5,,16,6,3,4,,,2,2,1,3,,51,-,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
65,75,Gorontalo,7502,Boalemo,750205,Mananggu,7502052009,Tabulo Selatan,9/3/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
66,75,Gorontalo,7502,Boalemo,750206,Botumoita,7502062001,Tutulo,3/10/2024,5/8/2026,11,21,32,9,5,,3,2,2,,,,3,2,5,1,,32,-,,18/08/2026,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
67,75,Gorontalo,7502,Boalemo,750206,Botumoita,7502062002,Hutamonu,25/9/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
68,75,Gorontalo,7502,Boalemo,750206,Botumoita,7502062003,Patoameme,23/9/2024,6/8/2026,9,16,25,8,5,,2,,1,1,,,1,1,5,1,,25,-,,26/08/2026,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
69,75,Gorontalo,7502,Boalemo,750206,Botumoita,7502062004,Tapadaa,30/9/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
70,75,Gorontalo,7502,Boalemo,750206,Botumoita,7502062005,Potanga,9/11/2024,29/7/2026,8,26,34,11,5,,6,2,1,,,,1,2,5,1,,34,-,,03/08/2026,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
71,75,Gorontalo,7502,Boalemo,750206,Botumoita,7502062006,Botumoito,25/3/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
72,75,Gorontalo,7502,Boalemo,750206,Botumoita,7502062007,Bolihutuo,26/9/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
73,75,Gorontalo,7502,Boalemo,750206,Botumoita,7502062008,Rumbia,22/9/2022,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
74,75,Gorontalo,7502,Boalemo,750206,Botumoita,7502062009,Dulangeya,23/10/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
75,75,Gorontalo,7502,Boalemo,750207,Paguyaman Pantai,7502072001,Bubaa,29/09/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
76,75,Gorontalo,7502,Boalemo,750207,Paguyaman Pantai,7502072002,Lito,29/09/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
77,75,Gorontalo,7502,Boalemo,750207,Paguyaman Pantai,7502072003,Limbatihu,29/09/2024,20/8/2026,26,13,39,9,4,4,-,3,5,3,-,-,3,4,3,1,-,39,-,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
78,75,Gorontalo,7502,Boalemo,750207,Paguyaman Pantai,7502072004,Bukit Karya,29/09/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
79,75,Gorontalo,7502,Boalemo,750207,Paguyaman Pantai,7502072005,Apitalawu,14/10/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
80,75,Gorontalo,7502,Boalemo,750207,Paguyaman Pantai,7502072006,Bangga,30/09/2024,11/9/2026,11,19,30,9,3,3,-,2,,3,,,1,1,6,2,,30,-,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
81,75,Gorontalo,7502,Boalemo,750207,Paguyaman Pantai,7502072007,Towayu,30/09/2024,27/8/2026,17,16,33,9,4,3,-,2,5,-,,,3,2,4,1,-,33,-,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
82,75,Gorontalo,7502,Boalemo,750207,Paguyaman Pantai,7502072008,Olibu,29/09/2024,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
`;

function pNum(v: string | undefined): number | null {
  if (!v) return null;
  const s = v.trim();
  if (!s || s === '-' || s === '- ' || s === 'Column 1') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function pStr(v: string | undefined): string {
  if (!v) return '';
  const s = v.trim();
  if (s === '-' || s === 'Column 1') return '';
  return s;
}

export const getInitialVillages = (): VillagePlanRecord[] => {
  const lines = RAW_BOALEMO_DATA.trim().split('\n');
  const records: VillagePlanRecord[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(',');

    const no = parseInt(cols[0], 10) || records.length + 1;
    const idProv = pStr(cols[1]) || '75';
    const provinsi = pStr(cols[2]) || 'Gorontalo';
    const idKab = pStr(cols[3]) || '7502';
    const kabupaten = pStr(cols[4]) || 'Boalemo';
    const idKec = pStr(cols[5]) || '';
    const kecamatan = pStr(cols[6]) || '';
    const idDesa = pStr(cols[7]) || '';
    const desa = pStr(cols[8]) || '';

    // Modul 1: RPJM Desa
    const rpjmDesTgl = pStr(cols[9]);

    // Modul 2: Musdes Persiapan
    const musdesPersiapan = {
      tanggal: pStr(cols[10]),
      lk: pNum(cols[11]),
      pr: pNum(cols[12]),
      unsur: {
        pemdes: pNum(cols[14]),
        bpd: pNum(cols[15]),
        rtRw: pNum(cols[16]),
        artm: pNum(cols[17]),
        pemuda: pNum(cols[18]),
        klpTani: pNum(cols[19]),
        klpNelayan: pNum(cols[20]),
        klpDifabel: pNum(cols[21]),
        klpMarginal: pNum(cols[22]),
        tokohAdat: pNum(cols[23]),
        tokohAgama: pNum(cols[24]),
        kaderDesa: pNum(cols[25]),
        peninjau: pNum(cols[26]),
        klpLainnya: pNum(cols[27]),
      },
      keterangan: pStr(cols[30]),
    };

    // Modul 3: Pencermatan
    const pencermatanRpjmTgl = pStr(cols[31]);

    // Modul 4: Musrenbangdes
    const musrenbangdes = {
      tanggal: pStr(cols[32]),
      lk: pNum(cols[33]),
      pr: pNum(cols[34]),
      unsur: {
        pemdes: pNum(cols[36]),
        bpd: pNum(cols[37]),
        rtRw: pNum(cols[38]),
        artm: pNum(cols[39]),
        pemuda: pNum(cols[40]),
        klpTani: pNum(cols[41]),
        klpNelayan: pNum(cols[42]),
        klpDifabel: pNum(cols[43]),
        klpMarginal: pNum(cols[44]),
        tokohAdat: pNum(cols[45]),
        tokohAgama: pNum(cols[46]),
        kaderDesa: pNum(cols[47]),
        peninjau: pNum(cols[48]),
        klpLainnya: pNum(cols[49]),
      },
      keterangan: pStr(cols[52]),
    };

    // Modul 5: Musdes Pengesahan
    const musdesPengesahan = {
      tanggal: pStr(cols[53]),
      lk: pNum(cols[54]),
      pr: pNum(cols[55]),
      unsur: {
        pemdes: pNum(cols[57]),
        bpd: pNum(cols[58]),
        rtRw: pNum(cols[59]),
        artm: pNum(cols[60]),
        pemuda: pNum(cols[61]),
        klpTani: pNum(cols[62]),
        klpNelayan: pNum(cols[63]),
        klpDifabel: pNum(cols[64]),
        klpMarginal: pNum(cols[65]),
        tokohAdat: pNum(cols[66]),
        tokohAgama: pNum(cols[67]),
        kaderDesa: pNum(cols[68]),
        peninjau: pNum(cols[69]),
        klpLainnya: pNum(cols[70]),
      },
      keterangan: pStr(cols[73]),
    };

    // Modul 6: Perdes RKP & APB
    const perdesRkpTgl = pStr(cols[74]);
    const rapbDesTgl = pStr(cols[75]);
    const perdesApbTgl = pStr(cols[76]);
    const perdesApbNomor = pStr(cols[77]);
    const perdesApbTahun = pStr(cols[78]) || '2027';

    // Modul 7: Musdesus KDMP
    const musdesusKdmp = {
      melaksanakan: pNum(cols[79]),
      tanggal: pStr(cols[80]),
      lk: pNum(cols[81]),
      pr: pNum(cols[82]),
      unsur: {
        pemdes: pNum(cols[84]),
        bpd: pNum(cols[85]),
        rtRw: pNum(cols[86]),
        artm: pNum(cols[87]),
        pemuda: pNum(cols[88]),
        klpTani: pNum(cols[89]),
        klpNelayan: pNum(cols[90]),
        klpDifabel: pNum(cols[91]),
        klpMarginal: pNum(cols[92]),
        tokohAdat: pNum(cols[93]), // Tokoh Masyarakat
        tokohAgama: pNum(cols[94]),
        kaderDesa: pNum(cols[95]),
        peninjau: pNum(cols[96]),
        klpLainnya: pNum(cols[97]),
      },
      keterangan: pStr(cols[100]),
    };

    // Modul 8: Perubahan & DD
    const perdesRkpPerubahanTgl = pStr(cols[101]);
    const perdesApbPerubahanTgl = pStr(cols[102]);
    const perdesApbPerubahanNomor = pStr(cols[103]);
    const nilaiDdKdmp = pNum(cols[104]);
    const keteranganUmum = pStr(cols[105]);

    records.push({
      no,
      idProv,
      provinsi,
      idKab,
      kabupaten,
      idKec,
      kecamatan,
      idDesa,
      desa,
      rpjmDesTgl,
      musdesPersiapan,
      pencermatanRpjmTgl,
      musrenbangdes,
      musdesPengesahan,
      perdesRkpTgl,
      rapbDesTgl,
      perdesApbTgl,
      perdesApbNomor,
      perdesApbTahun,
      musdesusKdmp,
      perdesRkpPerubahanTgl,
      perdesApbPerubahanTgl,
      perdesApbPerubahanNomor,
      nilaiDdKdmp,
      keteranganUmum,
    });
  }

  return records;
};

export const MODULES_CONFIG = [
  {
    key: 'overview',
    code: 'M0',
    title: 'Ringkasan & Master Data',
    shortTitle: 'Ringkasan',
    description: 'Identitas desa, kecamatan, kode wilayah, dan ringkasan progres',
    badge: 'Overview',
  },
  {
    key: 'modul1_rpjm',
    code: 'M1',
    title: 'Dasar RPJM Desa',
    shortTitle: 'RPJM Desa',
    description: 'Penerbitan Peraturan Desa tentang RPJM Desa',
    badge: 'Dasar',
  },
  {
    key: 'modul2_musdes_persiapan',
    code: 'M2',
    title: 'Musdes Persiapan & Tim RKPDes',
    shortTitle: 'Musdes Persiapan',
    description: 'Musyawarah Desa Persiapan dan Pembentukan Tim Penyusun RKP Desa',
    badge: 'Tahap 1',
  },
  {
    key: 'modul3_pencermatan',
    code: 'M3',
    title: 'Pencermatan Ulang RPJM Desa',
    shortTitle: 'Pencermatan',
    description: 'Pencermatan ulang dokumen RPJM Desa tahun berkenaan',
    badge: 'Tahap 2',
  },
  {
    key: 'modul4_musrenbangdes',
    code: 'M4',
    title: 'Musrenbangdes RKP Desa',
    shortTitle: 'Musrenbangdes',
    description: 'Musyawarah Perencanaan Pembangunan Desa Pembahasan Rancangan RKP Desa',
    badge: 'Tahap 3',
  },
  {
    key: 'modul5_musdes_pengesahan',
    code: 'M5',
    title: 'Musdes Pengesahan RKP Desa',
    shortTitle: 'Musdes RKPDes',
    description: 'Musyawarah Desa Pembahasan dan Pengesahan RKP Desa dan DU RKP Desa',
    badge: 'Tahap 4',
  },
  {
    key: 'modul6_perdes_apb',
    code: 'M6',
    title: 'Perdes RKP Desa & APB Desa',
    shortTitle: 'Perdes & APBDes',
    description: 'Penerbitan Perdes RKP Desa, penyusunan RAPB Desa, dan Perdes APB Desa',
    badge: 'Penetapan',
  },
  {
    key: 'modul7_kdmp',
    code: 'M7',
    title: 'Musdesus Pinjaman KDMP',
    shortTitle: 'Musdesus KDMP',
    description: 'Musdesus Persetujuan Dukungan Pengembalian Pinjaman KDMP',
    badge: 'Khusus',
  },
  {
    key: 'modul8_perubahan',
    code: 'M8',
    title: 'Perubahan & Anggaran DD',
    shortTitle: 'Perubahan / DD',
    description: 'Perdes RKPDes Perubahan, APBDes Perubahan, dan Nilai Dana Desa',
    badge: 'Perubahan',
  },
] as const;

export const KECAMATAN_LIST = [
  'Semua Kecamatan',
  'Paguyaman',
  'Wonosari',
  'Dulupi',
  'Tilamuta',
  'Mananggu',
  'Botumoita',
  'Paguyaman Pantai',
];
