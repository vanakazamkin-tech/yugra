import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = new URL('../supabase/imports/review/duma_budget_page4_general_defense_security_economy_manual_transcription.csv', import.meta.url);
const source = await readFile(file, 'utf8');
const [header, ...lines] = source.trim().split(/\r?\n/);
const columns = header.split(';');
const rows = lines.map((line) => {
  const values = line.split(';');
  assert.equal(values.length, columns.length, 'CSV delimiter/column count mismatch');
  return Object.fromEntries(columns.map((key, i) => [key, values[i]]));
});

const metricKeys = {
  candidate_budget_general_government_expenditure: 'general',
  candidate_budget_national_defense_expenditure: 'defense',
  candidate_budget_national_security_expenditure: 'security',
  candidate_budget_national_economy_expenditure: 'economy',
};
const expectedTotals = {
  general: [19728122.5, 21964121.3],
  defense: [80621.8, 86646.2],
  security: [1948989.5, 2074296.5],
  economy: [20643219.0, 25410302.5],
};
const expectedByMunicipality = {
  "nefteyugansk": {
    "general": [
      915015,
      987316.4
    ],
    "defense": null,
    "security": [
      59469.4,
      58930.3
    ],
    "economy": [
      1215471.3,
      1125989.7
    ]
  },
  "surgut": {
    "general": [
      2483140,
      2808442.5
    ],
    "defense": null,
    "security": [
      399113.4,
      421864.7
    ],
    "economy": [
      5484523.3,
      6074666.6
    ]
  },
  "khanty-mansiysk": {
    "general": [
      1135108.4,
      1340051.9
    ],
    "defense": null,
    "security": [
      268322.2,
      318652.6
    ],
    "economy": [
      1644802.7,
      2852576.7
    ]
  },
  "nizhnevartovsk": {
    "general": [
      1598936.2,
      1744781.1
    ],
    "defense": null,
    "security": [
      306195.3,
      372345.9
    ],
    "economy": [
      4361577.9,
      4267389.3
    ]
  },
  "megion": {
    "general": [
      519832.6,
      644639.2
    ],
    "defense": null,
    "security": [
      56557,
      60167
    ],
    "economy": [
      321724.6,
      604136.1
    ]
  },
  "uray": {
    "general": [
      322588.9,
      342249.4
    ],
    "defense": null,
    "security": [
      43569,
      48461.6
    ],
    "economy": [
      448191.7,
      371796
    ]
  },
  "kogalym": {
    "general": [
      803851.2,
      812142.3
    ],
    "defense": [
      3538.3,
      558.8
    ],
    "security": [
      69989.1,
      73821.6
    ],
    "economy": [
      600395.7,
      925727.1
    ]
  },
  "raduzhny": {
    "general": [
      462336.7,
      559881.7
    ],
    "defense": null,
    "security": [
      15291.1,
      17386.9
    ],
    "economy": [
      189555.4,
      246735.5
    ]
  },
  "langepas": {
    "general": [
      551558.1,
      593699.4
    ],
    "defense": null,
    "security": [
      86338.4,
      89598.3
    ],
    "economy": [
      291664.1,
      389906.2
    ]
  },
  "nyagan-city": {
    "general": [
      590871.9,
      743572.3
    ],
    "defense": null,
    "security": [
      56703.7,
      66102.9
    ],
    "economy": [
      395800.6,
      666915.5
    ]
  },
  "pyt-yakh": {
    "general": [
      537391,
      597777.6
    ],
    "defense": [
      8032.6,
      9436.5
    ],
    "security": [
      39850.2,
      42553.7
    ],
    "economy": [
      401488.2,
      462257
    ]
  },
  "pokachi": {
    "general": [
      327684.7,
      367967.1
    ],
    "defense": [
      3322.1,
      3785.7
    ],
    "security": [
      37112.2,
      37498.8
    ],
    "economy": [
      100217.6,
      157245.6
    ]
  },
  "yugorsk": {
    "general": [
      440360,
      500261
    ],
    "defense": [
      9920.1,
      9107.7
    ],
    "security": [
      11229.4,
      15152
    ],
    "economy": [
      412820.5,
      632798.3
    ]
  },
  "beloyarsky-raion": {
    "general": [
      708864,
      745710.1
    ],
    "defense": [
      4695.5,
      4969.2
    ],
    "security": [
      30272.3,
      39711.3
    ],
    "economy": [
      313989.8,
      545081.7
    ]
  },
  "berezovsky-raion": {
    "general": [
      754168.6,
      809560.9
    ],
    "defense": [
      2973.4,
      3983
    ],
    "security": [
      32841.3,
      32265.5
    ],
    "economy": [
      351376.5,
      475255
    ]
  },
  "kondinsky-raion": {
    "general": [
      726401,
      772738.1
    ],
    "defense": [
      4162.7,
      4911.6
    ],
    "security": [
      44446.7,
      9704.1
    ],
    "economy": [
      548953.2,
      757108.9
    ]
  },
  "october-raion": {
    "general": [
      720144.2,
      736775.7
    ],
    "defense": [
      4861,
      5610.9
    ],
    "security": [
      35530.7,
      43403
    ],
    "economy": [
      313152.7,
      540241.4
    ]
  },
  "surgutsky": {
    "general": [
      2794226.4,
      3083876.1
    ],
    "defense": [
      18777,
      21572.6
    ],
    "security": [
      96822.6,
      102747.2
    ],
    "economy": [
      1310941.9,
      1517780.1
    ]
  },
  "sovetsky-raion": {
    "general": [
      523930.8,
      664682.8
    ],
    "defense": [
      3461.6,
      3913.3
    ],
    "security": [
      40520.6,
      29991.4
    ],
    "economy": [
      480709.3,
      646696.4
    ]
  },
  "khanty-mansiysky-raion": {
    "general": [
      616702.4,
      665997.2
    ],
    "defense": [
      4162.4,
      4908.2
    ],
    "security": [
      88314.8,
      60988.4
    ],
    "economy": [
      553883.8,
      703952.1
    ]
  },
  "nizhnevartovsky-raion": {
    "general": [
      1208214,
      1235879.8
    ],
    "defense": [
      3976.5,
      4572
    ],
    "security": [
      83647.1,
      77495.1
    ],
    "economy": [
      356729.5,
      584909
    ]
  },
  "nefteyugansky-raion": {
    "general": [
      986796.4,
      1206118.7
    ],
    "defense": [
      8738.6,
      9316.7
    ],
    "security": [
      46853,
      55454.2
    ],
    "economy": [
      545248.7,
      861138.3
    ]
  }
};

assert.equal(rows.length, 176, 'Expected 4 indicators × 22 municipalities × 2 years');
assert.equal(new Set(rows.map(r => `${r.indicator_code}:${r.municipality_id}:${r.year}`)).size, 176, 'Duplicate indicator/municipality/year row');
assert.equal(new Set(rows.map(r => r.municipality_id)).size, 22, 'Expected all 22 municipalities');
assert.ok(rows.every(r => r.page === '4' && r.printed_page === '815'));
assert.ok(rows.every(r => r.review_status === 'needs_visual_review'));
assert.ok(rows.every(r => r.unit === 'тыс. руб.' && r.measure_type === 'amount'));

for (const [code, key] of Object.entries(metricKeys)) {
  const subset = rows.filter(r => r.indicator_code === code);
  assert.equal(subset.length, 44, `Expected 44 rows for ${code}`);
  for (const [i, year] of ['2023', '2024'].entries()) {
    const values = subset.filter(r => r.year === year);
    const actual = Math.round(values.reduce((sum, r) => sum + (r.value_raw === '' ? 0 : Number(r.value_raw.replace(',', '.'))), 0) * 10) / 10;
    assert.equal(actual, expectedTotals[key][i], `Control total mismatch for ${code} ${year}`);
  }
}

for (const [municipalityId, indicators] of Object.entries(expectedByMunicipality)) {
  for (const [code, key] of Object.entries(metricKeys)) {
    for (const [i, year] of ['2023', '2024'].entries()) {
      const row = rows.find(r => r.municipality_id === municipalityId && r.indicator_code === code && r.year === year);
      assert.ok(row, `Missing ${municipalityId}/${code}/${year}`);
      const expectedValue = indicators[key]?.[i] ?? null;
      if (expectedValue === null) {
        assert.equal(row.value_raw, '', `Source-empty cell must remain blank: ${municipalityId}/${code}/${year}`);
      } else {
        assert.equal(Number(row.value_raw.replace(',', '.')), expectedValue,
          `Municipal transcription mismatch: ${municipalityId}/${code}/${year}`);
      }
    }
  }
}

console.log('Duma page 4 general/defense/security/economy review transcription passed');
