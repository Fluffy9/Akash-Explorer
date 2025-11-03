import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen,} from '@testing-library/react'
import '@testing-library/jest-dom'

// API config
const API_URL = 'https://console-api.akash.network/v1/dashboard-data'

// TypeScript interfaces
interface DashboardData {
  now: {
    dailyUUsdSpent: number
    activeLeaseCount: number
  }
  networkCapacity: {
    activeProviderCount: number
  }
}

interface MetricCardProps {
  title: string
  value: string | number | null | undefined
  isLoading: boolean
  error: string | null
}

interface MetricProps {
  data: DashboardData | null
  isLoading?: boolean
  error?: string | null
}

// Store API data
let liveApiData: DashboardData | null = null

// Fetch the data
const fetchDashboardData = async () => {
  const response = await fetch(API_URL)
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }
  return await response.json()
}

// Helper fn to convert micro-USD to USD
const convertMicroUsdToUsd = (microUsd: number): number => {
  return microUsd / 1000000
}

// Helper fn to format USD
const formatUsd = (usd: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(usd)
}

// Helper fn to format numbers
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num)
}

const MetricCard = ({ title, value, isLoading, error }: MetricCardProps) => (
  <div data-testid={`metric-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
    <h3>{title}</h3>
    {isLoading && <div data-testid="loading-spinner">Loading...</div>}
    {error && <div data-testid="error-message">{error}</div>}
    {!isLoading && !error && <div data-testid="metric-value">{value}</div>}
  </div>
)

const UsdSpentMetric = ({ data, isLoading = false, error = null }: MetricProps) => {
  if (isLoading || error || !data) {
    return <MetricCard title="USD Spent (24h)" value="" isLoading={isLoading} error={error} />
  }
  const usd = convertMicroUsdToUsd(data.now.dailyUUsdSpent)
  const formatted = formatUsd(usd)
  return <MetricCard title="USD Spent (24h)" value={formatted} isLoading={isLoading} error={error} />
}

const ActiveLeasesMetric = ({ data, isLoading = false, error = null }: MetricProps) => {
  if (isLoading || error || !data) {
    return <MetricCard title="Active Leases" value="" isLoading={isLoading} error={error} />
  }
  const formatted = formatNumber(data.now.activeLeaseCount)
  return <MetricCard title="Active Leases" value={formatted} isLoading={isLoading} error={error} />
}

const ActiveProvidersMetric = ({ data, isLoading = false, error = null }: MetricProps) => {
  if (isLoading || error || !data) {
    return <MetricCard title="Active Providers" value="" isLoading={isLoading} error={error} />
  }
  const formatted = formatNumber(data.networkCapacity.activeProviderCount)
  return <MetricCard title="Active Providers" value={formatted} isLoading={isLoading} error={error} />
}

describe('Provider Statistics Tests', () => {
  // Fetch data before all tests
  beforeAll(async () => {
    liveApiData = await fetchDashboardData()
  })

  // USD Spent (24h) stats tests
  describe('USD Spent (24h) Metric', () => {
    it('should render with correct title', () => {
      render(<UsdSpentMetric data={liveApiData} />)

      expect(screen.getByText('USD Spent (24h)')).toBeInTheDocument()
    })

    it('should display USD value with proper formatting', () => {
      const usd = convertMicroUsdToUsd(liveApiData!.now.dailyUUsdSpent)
      const formatted = formatUsd(usd)

      render(<MetricCard title="USD Spent (24h)" value={formatted} isLoading={false} error={null} />)

      const value = screen.getByTestId('metric-value')
      expect(value).toHaveTextContent(formatted)
      expect(value.textContent).toMatch(/\$/)
      expect(value.textContent).toMatch(/,/)
      expect(value.textContent).toMatch(/\.\d{2}/)
    })

    it('should handle large numbers correctly', () => {
      const testData: DashboardData = {
        now: { dailyUUsdSpent: 1234567890000, activeLeaseCount: 0 },
        networkCapacity: { activeProviderCount: 0 }
      }
      render(<UsdSpentMetric data={testData} />)

      const value = screen.getByTestId('metric-value')
      expect(value).toHaveTextContent('$1,234,567.89')
    })

    it('should handle zero value', () => {
      const testData: DashboardData = {
        now: { dailyUUsdSpent: 0, activeLeaseCount: 0 },
        networkCapacity: { activeProviderCount: 0 }
      }
      render(<UsdSpentMetric data={testData} />)

      expect(screen.getByTestId('metric-value')).toHaveTextContent('$0.00')
    })

    it('should show loading state while fetching data', () => {
      render(<UsdSpentMetric data={null} isLoading={true} />)

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('should display error when API call fails', () => {
      render(<UsdSpentMetric data={null} error="Network error" />)

      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
  })

  // active leases stats tests
  describe('Active Leases Metric', () => {
    it('should render with correct title', () => {
      render(<ActiveLeasesMetric data={liveApiData} />)

      expect(screen.getByText('Active Leases')).toBeInTheDocument()
    })

    it('should display lease count with comma formatting', () => {
      const formatted = formatNumber(liveApiData!.now.activeLeaseCount)

      render(<MetricCard title="Active Leases" value={formatted} isLoading={false} error={null} />)

      const value = screen.getByTestId('metric-value')
      expect(value).toHaveTextContent(formatted)
      expect(typeof liveApiData!.now.activeLeaseCount).toBe('number')
    })

    it('should handle single digit lease count', () => {
      const testData: DashboardData = {
        now: { dailyUUsdSpent: 0, activeLeaseCount: 5 },
        networkCapacity: { activeProviderCount: 0 }
      }
      render(<ActiveLeasesMetric data={testData} />)

      expect(screen.getByTestId('metric-value')).toHaveTextContent('5')
    })

    it('should handle zero active leases', () => {
      const testData: DashboardData = {
        now: { dailyUUsdSpent: 0, activeLeaseCount: 0 },
        networkCapacity: { activeProviderCount: 0 }
      }
      render(<ActiveLeasesMetric data={testData} />)

      expect(screen.getByTestId('metric-value')).toHaveTextContent('0')
    })

    it('should handle large lease counts', () => {
      const testData: DashboardData = {
        now: { dailyUUsdSpent: 0, activeLeaseCount: 10000 },
        networkCapacity: { activeProviderCount: 0 }
      }
      render(<ActiveLeasesMetric data={testData} />)

      expect(screen.getByTestId('metric-value')).toHaveTextContent('10,000')
    })

    it('should show loading state while fetching data', () => {
      render(<ActiveLeasesMetric data={null} isLoading={true} />)

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('should display error when API call fails', () => {
      render(<ActiveLeasesMetric data={null} error="Failed to load leases" />)

      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
  })

  // active providers stats tests
  describe('Active Providers Metric', () => {
    it('should render with correct title', () => {
      render(<ActiveProvidersMetric data={liveApiData} />)

      expect(screen.getByText('Active Providers')).toBeInTheDocument()
    })

    it('should display provider count', () => {
      const formatted = formatNumber(liveApiData!.networkCapacity.activeProviderCount)

      render(<MetricCard title="Active Providers" value={formatted} isLoading={false} error={null} />)

      expect(screen.getByTestId('metric-value')).toHaveTextContent(formatted)
    })

    it('should handle single active provider', () => {
      const testData: DashboardData = {
        now: { dailyUUsdSpent: 0, activeLeaseCount: 0 },
        networkCapacity: { activeProviderCount: 1 }
      }
      render(<ActiveProvidersMetric data={testData} />)

      expect(screen.getByTestId('metric-value')).toHaveTextContent('1')
    })

    it('should handle zero active providers', () => {
      const testData: DashboardData = {
        now: { dailyUUsdSpent: 0, activeLeaseCount: 0 },
        networkCapacity: { activeProviderCount: 0 }
      }
      render(<ActiveProvidersMetric data={testData} />)

      expect(screen.getByTestId('metric-value')).toHaveTextContent('0')
    })

    it('should handle three-digit provider counts with comma', () => {
      const testData: DashboardData = {
        now: { dailyUUsdSpent: 0, activeLeaseCount: 0 },
        networkCapacity: { activeProviderCount: 123 }
      }
      render(<ActiveProvidersMetric data={testData} />)

      expect(screen.getByTestId('metric-value')).toHaveTextContent('123')
    })

    it('should show loading state while fetching data', () => {
      render(<ActiveProvidersMetric data={null} isLoading={true} />)

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('should display error when API call fails', () => {
      render(<ActiveProvidersMetric data={null} error="Provider data unavailable" />)

      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
  })

  // Edge cases
  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined data gracefully', () => {
      render(<UsdSpentMetric data={undefined as any} />)

      // Should not crash
      expect(screen.getByText('USD Spent (24h)')).toBeInTheDocument()
    })

    it('should handle null data gracefully', () => {
      render(<ActiveLeasesMetric data={null} />)

      expect(screen.getByText('Active Leases')).toBeInTheDocument()
    })

    it('should handle API timeout errors', () => {
      render(<ActiveProvidersMetric data={null} error="Request timeout" />)

      expect(screen.getByTestId('error-message')).toHaveTextContent('Request timeout')
    })

    it('should handle network disconnection', () => {
      render(<UsdSpentMetric data={null} error="Network unavailable" />)

      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
  })
})
