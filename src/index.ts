interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Meteors MCP — NASA fireball, near-Earth asteroid, and close approach data
 *
 * Sources:
 *   - NASA/JPL Fireball API: https://ssd-api.jpl.nasa.gov/fireball.api
 *   - NASA/JPL Close Approach Data: https://ssd-api.jpl.nasa.gov/cad.api
 *   - NASA NeoWs (Near Earth Object Web Service): https://api.nasa.gov/neo/rest/v1/feed
 *
 * Tools:
 * - get_fireballs: Recent bolide/fireball events with energy, velocity, and location
 * - get_close_approaches: Near-Earth asteroid close approaches within 0.05 AU
 * - get_neo_feed: Near-Earth objects for a date range (uses NASA DEMO_KEY)
 */


const JPL_BASE = 'https://ssd-api.jpl.nasa.gov';
const NEO_BASE = 'https://api.nasa.gov/neo/rest/v1';

type RawFireballData = {
  signature: { source: string; version: string };
  count: string;
  fields: string[];
  data: (string | null)[][];
};

type RawCadData = {
  signature: { source: string; version: string };
  count: string;
  fields: string[];
  data: string[][];
};

type RawNeoFeed = {
  element_count: number;
  near_earth_objects: Record<
    string,
    Array<{
      id: string;
      name: string;
      nasa_jpl_url: string;
      estimated_diameter: {
        kilometers: { estimated_diameter_min: number; estimated_diameter_max: number };
      };
      is_potentially_hazardous_asteroid: boolean;
      close_approach_data: Array<{
        close_approach_date: string;
        relative_velocity: { kilometers_per_hour: string };
        miss_distance: { astronomical: string; kilometers: string };
        orbiting_body: string;
      }>;
    }>
  >;
};

const tools: McpToolExport['tools'] = [
  {
    name: 'get_fireballs',
    description:
      'Get recent bolide and fireball events recorded by US government sensors. Returns impact energy, radiated energy, velocity, altitude, and geographic location for each event.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of fireball events to return (default 10, max 100).',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_close_approaches',
    description:
      'Get near-Earth asteroid close approach events within 0.05 AU of Earth. Returns object name, approach date, miss distance, relative velocity, and diameter estimates.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of close approach records to return (default 10, max 50).',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_neo_feed',
    description:
      'Get Near-Earth Objects (NEOs) passing by Earth for a given date range using the NASA NeoWs API. Returns asteroid names, sizes, velocities, miss distances, and hazard status.',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format (e.g. "2025-01-01").',
        },
        end_date: {
          type: 'string',
          description:
            'End date in YYYY-MM-DD format. Maximum 7-day range from start_date (e.g. "2025-01-07").',
        },
      },
      required: ['start_date', 'end_date'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_fireballs':
      return getFireballs((args.limit as number | undefined) ?? 10);
    case 'get_close_approaches':
      return getCloseApproaches((args.limit as number | undefined) ?? 10);
    case 'get_neo_feed':
      return getNeoFeed(args.start_date as string, args.end_date as string);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function getFireballs(limit: number) {
  const params = new URLSearchParams({ limit: String(Math.min(limit, 100)) });
  const res = await fetch(`${JPL_BASE}/fireball.api?${params}`);
  if (!res.ok) throw new Error(`JPL Fireball API error: ${res.status}`);
  const data = (await res.json()) as RawFireballData;

  const fields = data.fields;
  return {
    count: parseInt(data.count, 10),
    fireballs: data.data.map((row) => {
      const obj: Record<string, string | null> = {};
      fields.forEach((f, i) => { obj[f] = row[i]; });
      return {
        date: obj['date'],
        energy_GJ: obj['energy'] ? parseFloat(obj['energy']) : null,
        radiated_energy_J: obj['impact-e'] ? parseFloat(obj['impact-e']) : null,
        latitude: obj['lat'] ? parseFloat(obj['lat']) : null,
        latitude_dir: obj['lat-dir'],
        longitude: obj['lon'] ? parseFloat(obj['lon']) : null,
        longitude_dir: obj['lon-dir'],
        altitude_km: obj['alt'] ? parseFloat(obj['alt']) : null,
        velocity_km_s: obj['vel'] ? parseFloat(obj['vel']) : null,
      };
    }),
  };
}

async function getCloseApproaches(limit: number) {
  const params = new URLSearchParams({
    limit: String(Math.min(limit, 50)),
    'dist-max': '0.05',
  });
  const res = await fetch(`${JPL_BASE}/cad.api?${params}`);
  if (!res.ok) throw new Error(`JPL CAD API error: ${res.status}`);
  const data = (await res.json()) as RawCadData;

  const fields = data.fields;
  return {
    count: parseInt(data.count, 10),
    close_approaches: data.data.map((row) => {
      const obj: Record<string, string> = {};
      fields.forEach((f, i) => { obj[f] = row[i]; });
      return {
        designation: obj['des'],
        orbit_id: obj['orbit_id'],
        jd_time: obj['jd'],
        date: obj['cd'],
        distance_au: obj['dist'] ? parseFloat(obj['dist']) : null,
        distance_min_au: obj['dist_min'] ? parseFloat(obj['dist_min']) : null,
        velocity_rel_km_s: obj['v_rel'] ? parseFloat(obj['v_rel']) : null,
        velocity_inf_km_s: obj['v_inf'] ? parseFloat(obj['v_inf']) : null,
        h_magnitude: obj['h'] ? parseFloat(obj['h']) : null,
      };
    }),
  };
}

async function getNeoFeed(startDate: string, endDate: string) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    api_key: 'DEMO_KEY',
  });
  const res = await fetch(`${NEO_BASE}/feed?${params}`);
  if (!res.ok) throw new Error(`NASA NeoWs API error: ${res.status}`);
  const data = (await res.json()) as RawNeoFeed;

  const objects = Object.entries(data.near_earth_objects).flatMap(([date, neos]) =>
    neos.map((neo) => ({
      date,
      id: neo.id,
      name: neo.name,
      potentially_hazardous: neo.is_potentially_hazardous_asteroid,
      diameter_km_min: neo.estimated_diameter.kilometers.estimated_diameter_min,
      diameter_km_max: neo.estimated_diameter.kilometers.estimated_diameter_max,
      close_approaches: neo.close_approach_data.map((ca) => ({
        date: ca.close_approach_date,
        velocity_km_h: parseFloat(ca.relative_velocity.kilometers_per_hour),
        miss_distance_au: parseFloat(ca.miss_distance.astronomical),
        miss_distance_km: parseFloat(ca.miss_distance.kilometers),
        orbiting_body: ca.orbiting_body,
      })),
    })),
  );

  return {
    element_count: data.element_count,
    near_earth_objects: objects,
  };
}

export default { tools, callTool, meter: { credits: 5 } } satisfies McpToolExport;
