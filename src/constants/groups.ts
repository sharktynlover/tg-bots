/** Canonical college groups: display name -> latin slug. */
export const GROUPS: Record<string, Record<string, string>> = {
  e: {
    'Э-170': 'e-170',
    'Э-171': 'e-171',
    'Э-172': 'e-172',
    'Э-268': 'e-268',
    'Э-269': 'e-269',
    'Э-366': 'e-366',
    'Э-367': 'e-367',
    'Э-464': 'e-464',
    'Э-465': 'e-465',
  },
  bi: {
    'Би-131': 'bi-131',
    'Би-132': 'bi-132',
    'Би-229': 'bi-229',
    'Би-230': 'bi-230',
    'Би-327': 'bi-327',
    'Би-328': 'bi-328',
    'Би-425-426': 'bi-425-426',
  },
  d: {
    'Д-128': 'd-128',
    'Д-129': 'd-129',
    'Д-226': 'd-226',
    'Д-227': 'd-227',
    'Д-324': 'd-324',
    'Д-325': 'd-325',
    'Д-422': 'd-422',
    'Д-423': 'd-423',
  },
  is: {
    'Ис-231': 'is-231',
    'Ис-232': 'is-232',
    'Ис-233': 'is-233',
    'Ис-234': 'is-234',
    'Ис-327': 'is-327',
    'Ис-328': 'is-328',
    'Ис-329-330': 'is-329-330',
    'Ис-423': 'is-423',
    'Ис-424': 'is-424',
    'Ис-425': 'is-425',
    'Ис-426': 'is-426',
  },
  isv: {
    'ИсВ-103': 'isv-103',
    'ИсВ-104': 'isv-104',
  },
  isr: {
    'ИсР-101': 'isr-101',
    'ИсР-102': 'isr-102',
  },
  l: {
    'Л-121': 'l-121',
    'Л-219': 'l-219',
    'Л-318': 'l-318',
  },
  oi: {
    'Ои-107': 'oi-107',
    'Ои-108': 'oi-108',
    'Ои-205': 'oi-205',
    'Ои-206': 'oi-206',
  },
  rm: {
    'Рм-112': 'rm-112',
    'Рм-113': 'rm-113',
    'Рм-114': 'rm-114',
    'Рм-115': 'rm-115',
    'Рм-116': 'rm-116',
    'Рм-117': 'rm-117',
    'Рм-208': 'rm-208',
    'Рм-209': 'rm-209',
    'Рм-210': 'rm-210',
    'Рм-211': 'rm-211',
    'Рм-304': 'rm-304',
    'Рм-305': 'rm-305',
    'Рм-306': 'rm-306',
    'Рм-406': 'rm-406',
    'Рм-407': 'rm-407',
    'Рм-408': 'rm-408',
    'Рм-409': 'rm-409',
  },
  re: {
    'Рэ-108': 're-108',
    'Рэ-109': 're-109',
    'Рэ-206': 're-206',
    'Рэ-207': 're-207',
    'Рэ-304': 're-304',
  },
  sa: {
    'Са-118': 'sa-118',
    'Са-119': 'sa-119',
    'Са-120': 'sa-120',
    'Са-121': 'sa-121',
    'Са-215': 'sa-215',
    'Са-216': 'sa-216',
    'Са-217': 'sa-217',
    'Са-312': 'sa-312',
    'Са-313': 'sa-313',
    'Са-314': 'sa-314',
    'Са-409': 'sa-409',
    'Са-410-411': 'sa-410-411',
  },
};

export const GROUP_NAMES: string[] = Object.values(GROUPS).flatMap((faculty) =>
  Object.keys(faculty),
);

/** Strips case, spaces and separators so "ис 329 330" matches "Ис-329-330". */
function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[\s\-_.]+/g, '');
}

const GROUP_BY_KEY = new Map<string, string>();
for (const faculty of Object.values(GROUPS)) {
  for (const [name, slug] of Object.entries(faculty)) {
    GROUP_BY_KEY.set(normalizeKey(name), name);
    GROUP_BY_KEY.set(normalizeKey(slug), name);
  }
}

/** Returns the canonical group name for user input, or null when unknown. */
export function resolveGroup(input: string): string | null {
  return GROUP_BY_KEY.get(normalizeKey(input)) ?? null;
}

/** Group names joined per faculty, one faculty per line. */
export function formatGroupList(): string {
  return Object.values(GROUPS)
    .map((faculty) => Object.keys(faculty).join(', '))
    .join('\n');
}
