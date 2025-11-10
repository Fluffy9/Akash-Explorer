import React, { useState, useEffect } from 'react';
import { Box, Text, useColorModeValue } from '@interchain-ui/react';

// SVG Icon Components
const ExternalLinkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

interface Provider {
  id: string;
  name: string;
  network: string;
  chainId: string;
  uptime: string;
  status: 'Active' | 'Inactive' | 'Syncing';
  avatar?: string;
}

interface ProvidersProps {
  initialVisible?: number;
}

const Providers: React.FC<ProvidersProps> = ({ 
  initialVisible = 7
}) => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(initialVisible);
  const [showAll, setShowAll] = useState(false);
  const [filterNetwork, setFilterNetwork] = useState<string>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Theme colors
  const cardBg = useColorModeValue('#FFFFFF', '#1F2937');
  const textPrimary = useColorModeValue('#111827', '#FFFFFF');
  const textSecondary = useColorModeValue('#6B7280', '#9CA3AF');
  const borderColor = useColorModeValue('rgba(0, 0, 0, 0.1)', 'rgba(255, 255, 255, 0.1)');
  const hoverBg = useColorModeValue('rgba(0, 0, 0, 0.02)', 'rgba(255, 255, 255, 0.02)');

  // Fetch providers from API
  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('https://console-api.akash.network/v1/providers');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch providers: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform API data to match our Provider interface
      const transformedProviders: Provider[] = data.map((provider: any, index: number) => {
        // Determine status based on provider data
        let status: 'Active' | 'Inactive' | 'Syncing' = 'Active';
        if (provider.isOnline === false) {
          status = 'Inactive';
        } else if (provider.isAudited === false) {
          status = 'Syncing';
        }
        
        return {
          id: provider.owner || `provider-${index}`,
          name: provider.hostUri || provider.owner?.substring(0, 10) || 'Provider',
          network: 'Akash',
          chainId: provider.chainId || 'akashnet-2',
          uptime: provider.uptime ? `${Math.floor(provider.uptime / 3600)}hrs` : 'N/A',
          status: status
        };
      });
      
      setProviders(transformedProviders);
    } catch (err) {
      console.error('Error fetching providers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  };

  // Fetch providers on component mount
  useEffect(() => {
    fetchProviders();
  }, []);

  // Get unique networks for filter
  const networks = ['All', ...Array.from(new Set(providers.map(p => p.network)))];

  // Filter providers
  const filteredProviders = filterNetwork === 'All' 
    ? providers 
    : providers.filter(p => p.network === filterNetwork);

  const displayedProviders = showAll ? filteredProviders : filteredProviders.slice(0, visibleCount);

  const handleViewAll = () => {
    setShowAll(!showAll);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchProviders();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusColor = (status: Provider['status']) => {
    switch (status) {
      case 'Active':
        return '#10B981';
      case 'Inactive':
        return '#EF4444';
      case 'Syncing':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusBgColor = (status: Provider['status']) => {
    switch (status) {
      case 'Active':
        return 'rgba(16, 185, 129, 0.1)';
      case 'Inactive':
        return 'rgba(239, 68, 68, 0.1)';
      case 'Syncing':
        return 'rgba(107, 114, 128, 0.1)';
      default:
        return 'rgba(107, 114, 128, 0.1)';
    }
  };

  return (
    <Box
      backgroundColor={cardBg}
      borderRadius="$lg"
      p="$10"
      attributes={{
        style: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginTop: '24px'
        }
      }}
    >
      {/* Header with Actions */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <Text fontSize="$2xl" fontWeight="$bold" color={textPrimary}>
          Providers
        </Text>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Filter Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={filterNetwork}
              onChange={(e) => setFilterNetwork(e.target.value)}
              style={{
                padding: '8px 32px 8px 12px',
                borderRadius: '6px',
                border: `1px solid ${borderColor}`,
                background: cardBg,
                color: textPrimary,
                fontSize: '14px',
                cursor: 'pointer',
                appearance: 'none'
              }}
            >
              {networks.map(network => (
                <option key={network} value={network}>{network}</option>
              ))}
            </select>
            <div style={{ 
              position: 'absolute', 
              right: '10px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: textSecondary,
              display: 'flex',
              alignItems: 'center'
            }}>
              <FilterIcon />
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${borderColor}`,
              background: cardBg,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'transform 0.2s',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <RefreshIcon 
              className={isRefreshing ? 'spinning' : ''}
            />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div style={{
          padding: '16px',
          marginBottom: '24px',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #EF4444',
          color: '#EF4444'
        }}>
          <Text fontSize="$sm" fontWeight="$semibold">Error loading providers</Text>
          <Box attributes={{ style: { marginTop: '4px' } }}>
            <Text fontSize="$xs">{error}</Text>
          </Box>
        </div>
      )}

      {/* Loading State */}
      {loading && providers.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: textSecondary
        }}>
          <Text fontSize="$lg">Loading providers...</Text>
        </div>
      ) : (
        <>
          {/* Stats Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '24px',
            padding: '16px',
            borderRadius: '8px',
            background: hoverBg
          }}>
            <div>
              <Text fontSize="$xs" color={textSecondary}>Total Providers</Text>
              <Text fontSize="$xl" fontWeight="$bold" color={textPrimary}>
                {filteredProviders.length}
              </Text>
            </div>
            <div>
              <Text fontSize="$xs" color={textSecondary}>Active</Text>
              <Text fontSize="$xl" fontWeight="$bold" color="#10B981">
                {filteredProviders.filter(p => p.status === 'Active').length}
              </Text>
            </div>
            <div>
              <Text fontSize="$xs" color={textSecondary}>Syncing/Inactive</Text>
              <Text fontSize="$xl" fontWeight="$bold" color="#EF4444">
                {filteredProviders.filter(p => p.status !== 'Active').length}
              </Text>
            </div>
          </div>

          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.5fr 2fr 1.5fr 1.5fr',
            gap: '16px',
            padding: '16px 0',
            borderBottom: `1px solid ${borderColor}`,
            marginBottom: '8px'
          }}>
            <Text fontSize="$sm" fontWeight="$semibold" color="#EF4444">Provider</Text>
            <Text fontSize="$sm" fontWeight="$semibold" color="#EF4444">Network</Text>
            <Text fontSize="$sm" fontWeight="$semibold" color="#EF4444">Chain ID</Text>
            <Text fontSize="$sm" fontWeight="$semibold" color="#EF4444">Uptime</Text>
            <Text fontSize="$sm" fontWeight="$semibold" color="#EF4444">Status</Text>
          </div>

          {/* Table Rows */}
          <div style={{ position: 'relative', minHeight: '300px' }}>
            {displayedProviders.map((provider, index) => (
              <div
                key={provider.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.5fr 2fr 1.5fr 1.5fr',
                  gap: '16px',
                  padding: '20px 0',
                  borderBottom: `1px solid ${borderColor}`,
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s, opacity 0.3s, transform 0.3s',
                  opacity: 1,
                  transform: 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = hoverBg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Provider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#FFFFFF'
                    }} />
                  </div>
                  <Text fontSize="$md" color={textPrimary} fontWeight="$medium">
                    {provider.name}
                  </Text>
                </div>

                {/* Network */}
                <Text fontSize="$md" color={textSecondary}>{provider.network}</Text>

                {/* Chain ID */}
                <Text fontSize="$md" color={textSecondary} fontFamily="monospace">
                  {provider.chainId}
                </Text>

                {/* Uptime */}
                <Text fontSize="$md" color={textSecondary}>{provider.uptime}</Text>

                {/* Status */}
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 16px',
                    borderRadius: '6px',
                    backgroundColor: getStatusBgColor(provider.status),
                    border: `1px solid ${getStatusColor(provider.status)}`
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(provider.status),
                      animation: provider.status === 'Active' ? 'pulse 2s infinite' : 'none'
                    }} />
                    <Text 
                      fontSize="$sm" 
                      fontWeight="$semibold" 
                      color={getStatusColor(provider.status)}
                    >
                      {provider.status}
                    </Text>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Blur overlay for last 2 rows when not showing all */}
            {!showAll && filteredProviders.length > visibleCount && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '120px',
                background: `linear-gradient(to bottom, transparent, ${cardBg})`,
                pointerEvents: 'none'
              }} />
            )}

            {/* Empty State */}
            {displayedProviders.length === 0 && !loading && (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: textSecondary
              }}>
                <Text fontSize="$lg">No providers found</Text>
                <Box attributes={{ style: { marginTop: '8px' } }}>
                  <Text fontSize="$sm" color={textSecondary}>
                    Try adjusting your filters
                  </Text>
                </Box>
              </div>
            )}
          </div>

          {/* View All Button */}
          {filteredProviders.length > visibleCount && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '24px',
              position: 'relative',
              zIndex: 10
            }}>
              <button
                onClick={handleViewAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: '#7F1D1D',
                  border: '1px solid #991B1B',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#991B1B';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#7F1D1D';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <span>{showAll ? 'Show Less' : `View All (${filteredProviders.length})`}</span>
                <ExternalLinkIcon />
              </button>
            </div>
          )}
        </>
      )}

      {/* Add keyframes for animations */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .spinning {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
    </Box>
  );
};

export default Providers;