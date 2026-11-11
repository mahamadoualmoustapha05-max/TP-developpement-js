const API_URL = 'https://countries.trevorblades.com/'

const COUNTRY_FIELDS = `
  code
  name
  native
  capital
  continent { name }
`

export const ALL_COUNTRIES_QUERY = `
  query Countries {
    countries { ${COUNTRY_FIELDS} }
  }
`

export const COUNTRY_BY_CODE_QUERY = `
  query CountryByCode($code: ID!) {
    country(code: $code) { ${COUNTRY_FIELDS} }
  }
`

export async function fetchCountryData(query, variables = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })

  if (!response.ok) throw new Error(`Erreur ${response.status}`)

  const result = await response.json()
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join('; '))
  }

  return result.data
}

export function normalizeCountry(country) {
  return {
    code: country.code,
    name: {
      common: country.name,
      official: country.native || country.name
    },
    capital: country.capital ? [country.capital] : null,
    region: country.continent?.name || '—',
    flags: {
      svg: `https://flagcdn.com/${country.code.toLowerCase()}.svg`
    }
  }
}
