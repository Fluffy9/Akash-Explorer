import React, { useState, useEffect } from 'react';
import { Box, Icon, Text, useColorModeValue } from '@interchain-ui/react';

interface Holder {
    address: string;
    fullAddress?: string;
    balance: number;
    percentage: number;
    rank: number;
}

interface BubblePosition {
    left: number;
    top: number;
}

const TopHoldersBubbleMap: React.FC = () => {
    const [holders, setHolders] = useState<Holder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dataSource, setDataSource] = useState<'loading' | 'live' | 'error'>('loading');
    const [totalSupply, setTotalSupply] = useState<number | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    const [hoveredHolder, setHoveredHolder] = useState<string | null>(null);
    const [selectedHolder, setSelectedHolder] = useState<string | null>(null);

    // Akash Network official brand colors
    const akashPrimary = '#FF414C';
    const bgColor = useColorModeValue('#000000', '#000000');
    const textColor = useColorModeValue('#FFFFFF', '#FFFFFF');
    const textSecondary = useColorModeValue('#9CA3AF', '#9CA3AF');
    const cardBg = 'rgba(255, 65, 76, 0.1)';
    const cardBorder = 'rgba(255, 65, 76, 0.3)';

    useEffect(() => {
        fetchTopHolders();
        
        // Auto-refresh every 5 minutes
        const interval = setInterval(() => {
            fetchTopHolders();
        }, 5 * 60 * 1000);
        
        return () => clearInterval(interval);
    }, []);

    const fetchWithTimeout = (url: string, timeout = 8000): Promise<Response> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        return fetch(url, { signal: controller.signal })
            .then(response => {
                clearTimeout(timeoutId);
                return response;
            })
            .catch(err => {
                clearTimeout(timeoutId);
                if (err.name === 'AbortError') {
                    throw new Error('Request timeout');
                }
                throw err;
            });
    };

    const fetchTopHolders = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Use the working Akash API endpoint directly
            const API_BASE = 'https://akash.c29r3.xyz/api';
            
            console.log('Fetching holder data from blockchain...');
            
            // Fetch total supply
            const supplyResponse = await fetchWithTimeout(`${API_BASE}/cosmos/bank/v1beta1/supply/uakt`);
            if (!supplyResponse.ok) throw new Error('Failed to fetch total supply');
            
            const supplyData = await supplyResponse.json();
            const totalSupplyValue = supplyData?.amount?.amount 
                ? parseFloat(supplyData.amount.amount) / 1000000 
                : null;
            
            setTotalSupply(totalSupplyValue);
            console.log('Total supply:', totalSupplyValue?.toLocaleString(), 'AKT');
            
            // Fetch holders with pagination
            const allHolders: any[] = [];
            let offset = 0;
            const limit = 100;
            let hasMore = true;
            const maxHolders = 500; // Limit for performance
            
            while (hasMore && allHolders.length < maxHolders) {
                console.log(`Fetching holders: offset=${offset}, limit=${limit}`);
                
                const holdersResponse = await fetchWithTimeout(
                    `${API_BASE}/cosmos/bank/v1beta1/denom_owners/uakt?pagination.offset=${offset}&pagination.limit=${limit}`
                );
                
                if (!holdersResponse.ok) {
                    console.error('Failed to fetch holders page');
                    break;
                }
                
                const holdersData = await holdersResponse.json();
                
                if (holdersData?.denom_owners && holdersData.denom_owners.length > 0) {
                    allHolders.push(...holdersData.denom_owners);
                    console.log(`Total holders fetched: ${allHolders.length}`);
                    
                    // Check if there are more pages
                    hasMore = holdersData.pagination?.next_key != null && 
                              holdersData.pagination.next_key !== '';
                    offset += limit;
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                } else {
                    break;
                }
            }
            
            if (allHolders.length === 0) {
                throw new Error('No holder data received');
            }
            
            console.log(`Processing ${allHolders.length} holders...`);
            
            // Process holders: convert uakt to AKT, sort, rank
            const processedHolders = allHolders
                .map(holder => ({
                    address: holder.address,
                    balance: parseFloat(holder.balance.amount) / 1000000 // uakt to AKT
                }))
                .filter(holder => holder.balance > 0)
                .sort((a, b) => b.balance - a.balance)
                .slice(0, 15) // Top 15
                .map((holder, index) => ({
                    address: truncateAddress(holder.address),
                    fullAddress: holder.address,
                    balance: holder.balance,
                    percentage: totalSupplyValue 
                        ? (holder.balance / totalSupplyValue) * 100 
                        : 0,
                    rank: index + 1
                }));

            console.log('Top 15 holders processed:', processedHolders.length);
            
            setHolders(processedHolders);
            setLastUpdated(Date.now());
            setDataSource('live');
            setIsLoading(false);

        } catch (err: any) {
            console.error('Failed to fetch holder data:', err);
            setError(err.message || 'Failed to fetch holder data');
            setDataSource('error');
            setIsLoading(false);
        }
    };

    const truncateAddress = (address: string): string => {
        if (address.length <= 20) return address;
        return `${address.slice(0, 11)}...${address.slice(-4)}`;
    };

    const formatTimestamp = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'just now';
        if (minutes === 1) return '1 minute ago';
        if (minutes < 60) return `${minutes} minutes ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours === 1) return '1 hour ago';
        return `${hours} hours ago`;
    };

    const balances = holders.map(h => h.balance);
    const maxBalance = balances.length > 0 ? Math.max(...balances) : 0;
    const minBalance = balances.length > 0 ? Math.min(...balances) : 0;

    const getBubbleSize = (balance: number): number => {
        if (maxBalance === minBalance) return 100;
        const minSize = 40;
        const maxSize = 180;
        const normalized = (balance - minBalance) / (maxBalance - minBalance);
        return minSize + normalized * (maxSize - minSize);
    };

    const getColor = (rank: number): string => {
        const colors = [
            '#FF414C', '#FF5058', '#FF5F64', '#FF6E70', '#FF7D7C',
            '#FF8C88', '#FF9B94', '#FFAAA0', '#FFB9AC', '#FFC8B8',
            '#FFD7C4', '#FFE6D0', '#FFF5DC', '#FFF8E8', '#FFFCF4'
        ];
        return colors[rank % colors.length];
    };

    const formatBalance = (balance: number): string => {
        if (balance >= 1000000) {
            return `${(balance / 1000000).toFixed(2)}M`;
        } else if (balance >= 1000) {
            return `${(balance / 1000).toFixed(2)}K`;
        }
        return balance.toLocaleString();
    };

    const UsersIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );

    const RefreshIcon = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
    );

    const calculateBubblePosition = (index: number, total: number): BubblePosition => {
        const containerWidth = 800;
        const containerHeight = 600;
        const padding = 100;

        const angle = index * 2.4;
        const radius = (index / total) * Math.min(containerWidth, containerHeight) / 2.5;
        const x = containerWidth / 2 + radius * Math.cos(angle);
        const y = containerHeight / 2 + radius * Math.sin(angle);

        return {
            left: Math.max(padding, Math.min(x, containerWidth - padding)),
            top: Math.max(padding, Math.min(y, containerHeight - padding))
        };
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: `linear-gradient(135deg, ${bgColor} 0%, #1a0505 50%, ${bgColor} 100%)`,
            padding: '3rem'
        }}>
            <Box maxWidth="1280px" mx="auto">
                {/* Header */}
                <div style={{ marginBottom: '3rem' }}>
                    <Box textAlign="center">
                        <div style={{ marginBottom: '1.5rem' }}>
                            <Box display="flex" alignItems="center" justifyContent="center" gap="$4">
                                <Icon name="walletFilled" size="$2xl" color={akashPrimary} />
                                <Text fontSize="$4xl" fontWeight="$bold" color={textColor}>
                                    Akash Network
                                </Text>
                            </Box>
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                            <Box display="flex" alignItems="center" justifyContent="center" gap="$3">
                                <Text fontSize="$2xl" fontWeight="$semibold" color={akashPrimary}>
                                    Top Holders Distribution
                                </Text>
                                {!isLoading && dataSource === 'live' && (
                                    <button
                                        onClick={fetchTopHolders}
                                        style={{
                                            background: 'rgba(255, 65, 76, 0.2)',
                                            border: '1px solid rgba(255, 65, 76, 0.5)',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            color: akashPrimary,
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 65, 76, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 65, 76, 0.2)';
                                        }}
                                    >
                                        <RefreshIcon />
                                        <span style={{ fontSize: '14px' }}>Refresh</span>
                                    </button>
                                )}
                            </Box>
                        </div>
                        <Text color={textSecondary}>
                            Bubble size represents token holdings
                        </Text>
                        {dataSource === 'live' && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <Text color="#4ADE80" fontSize="$sm">
                                    ✓ Live data from Akash blockchain
                                </Text>
                                {lastUpdated && (
                                    <div style={{ marginTop: '0.25rem' }}>
                                        <Text color={textSecondary} fontSize="$xs">
                                            Updated {formatTimestamp(lastUpdated)}
                                        </Text>
                                    </div>
                                )}
                            </div>
                        )}
                {dataSource === 'error' && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <Text color="#FFA500" fontSize="$sm">
                                    ⚠️ Unable to fetch holder data
                                </Text>
                                <div style={{ marginTop: '0.25rem' }}>
                                    <Text color={textSecondary} fontSize="$xs">
                                        {error || 'Blockchain API temporarily unavailable'}
                                    </Text>
                                </div>
                            </div>
                        )}
                        {totalSupply && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <Text color={textSecondary} fontSize="$xs">
                                    Total Supply: {totalSupply.toLocaleString()} AKT
                                </Text>
                            </div>
                        )}
                    </Box>
                </div>

                {/* Stats Bar */}
                {holders.length > 0 && (
                    <div style={{ marginBottom: '3rem' }}>
                        <Box
                            display="grid"
                            gridTemplateColumns={{ mobile: '1fr', tablet: 'repeat(3, 1fr)' }}
                            gap="$6"
                        >
                            <Box
                                backgroundColor={cardBg}
                                borderRadius="$lg"
                                p="$8"
                                border={`1px solid ${cardBorder}`}
                            >
                                <Box display="flex" alignItems="center" gap="$4">
                                    <Box color={akashPrimary}>
                                        <UsersIcon />
                                    </Box>
                                    <Box>
                                        <div style={{ marginBottom: '0.25rem' }}>
                                            <Text color={textSecondary} fontSize="$sm">
                                                Top Holders
                                            </Text>
                                        </div>
                                        <Text color={textColor} fontSize="$3xl" fontWeight="$bold">
                                            {holders.length}
                                        </Text>
                                    </Box>
                                </Box>
                            </Box>

                            <Box
                                backgroundColor={cardBg}
                                borderRadius="$lg"
                                p="$8"
                                border={`1px solid ${cardBorder}`}
                            >
                                <Box display="flex" alignItems="center" gap="$4">
                                    <Icon name="arrowUpS" size="$xl" color={akashPrimary} />
                                    <Box>
                                        <div style={{ marginBottom: '0.25rem' }}>
                                            <Text color={textSecondary} fontSize="$sm">
                                                Largest Holder
                                            </Text>
                                        </div>
                                        <Text color={textColor} fontSize="$3xl" fontWeight="$bold">
                                            {holders[0]?.percentage.toFixed(2)}%
                                        </Text>
                                    </Box>
                                </Box>
                            </Box>

                            <Box
                                backgroundColor={cardBg}
                                borderRadius="$lg"
                                p="$8"
                                border={`1px solid ${cardBorder}`}
                            >
                                <Box display="flex" alignItems="center" gap="$4">
                                    <Icon name="walletFilled" size="$xl" color={akashPrimary} />
                                    <Box>
                                        <div style={{ marginBottom: '0.25rem' }}>
                                            <Text color={textSecondary} fontSize="$sm">
                                                Top 15 Control
                                            </Text>
                                        </div>
                                        <Text color={textColor} fontSize="$3xl" fontWeight="$bold">
                                            {holders.slice(0, 15).reduce((sum, h) => sum + h.percentage, 0).toFixed(1)}%
                                        </Text>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <Box
                        backgroundColor="rgba(255, 65, 76, 0.05)"
                        borderRadius="$2xl"
                        p="$12"
                        border="1px solid rgba(255, 65, 76, 0.2)"
                        textAlign="center"
                        mb="$8"
                    >
                        <Text color={textColor} fontSize="$lg">
                            Loading holder data from blockchain...
                        </Text>
                        <div style={{ marginTop: '0.5rem' }}>
                            <Text color={textSecondary} fontSize="$sm">
                                This may take a few moments
                            </Text>
                        </div>
                    </Box>
                )}

                {/* Error State */}
                {dataSource === 'error' && !isLoading && (
                    <Box
                        backgroundColor="rgba(255, 65, 76, 0.05)"
                        borderRadius="$2xl"
                        p="$12"
                        border="1px solid rgba(255, 65, 76, 0.2)"
                        textAlign="center"
                        mb="$8"
                    >
                        <Text color={textColor} fontSize="$lg">
                            Unable to load holder data
                        </Text>
                        <div style={{ marginTop: '0.5rem' }}>
                            <Text color={textSecondary} fontSize="$sm">
                                The blockchain API may be temporarily unavailable
                            </Text>
                        </div>
                        <button
                            onClick={fetchTopHolders}
                            style={{
                                marginTop: '1rem',
                                background: akashPrimary,
                                border: 'none',
                                borderRadius: '8px',
                                padding: '12px 24px',
                                cursor: 'pointer',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            Retry
                        </button>
                    </Box>
                )}

                {/* Bubble Map Container */}
                {!isLoading && holders.length > 0 && (
                    <div style={{ marginBottom: '3rem' }}>
                        <Box
                            backgroundColor="rgba(255, 65, 76, 0.05)"
                            borderRadius="$2xl"
                            p="$12"
                            border="1px solid rgba(255, 65, 76, 0.2)"
                        >
                            <Box position="relative" height="600px">
                                {holders.map((holder, index) => {
                                    const size = getBubbleSize(holder.balance);
                                    const position = calculateBubblePosition(index, holders.length);
                                    const isHovered = hoveredHolder === holder.address;
                                    const isSelected = selectedHolder === holder.address;

                                    return (
                                        <Box
                                            key={holder.address}
                                            position="absolute"
                                            width={`${size}px`}
                                            height={`${size}px`}
                                            attributes={{
                                                style: {
                                                    left: `${position.left}px`,
                                                    top: `${position.top}px`,
                                                    backgroundColor: getColor(holder.rank - 1),
                                                    transform: `translate(-50%, -50%) scale(${isHovered || isSelected ? 1.1 : 1})`,
                                                    opacity: isHovered || isSelected ? 1 : 0.85,
                                                    zIndex: isHovered || isSelected ? 10 : 1,
                                                    boxShadow: isHovered || isSelected
                                                        ? '0 20px 60px rgba(255, 65, 76, 0.5)'
                                                        : '0 10px 30px rgba(0, 0, 0, 0.3)',
                                                    borderRadius: '50%',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease',
                                                },
                                                onMouseEnter: () => setHoveredHolder(holder.address),
                                                onMouseLeave: () => setHoveredHolder(null),
                                                onClick: () => setSelectedHolder(selectedHolder === holder.address ? null : holder.address)
                                            }}
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                        >
                                            <Box textAlign="center" color="white" fontWeight="$bold">
                                                <Text fontSize="$sm">#{holder.rank}</Text>
                                                <div style={{ marginTop: '0.25rem' }}>
                                                    <Text fontSize="$xs">{holder.percentage.toFixed(1)}%</Text>
                                                </div>
                                            </Box>

                                            {/* Tooltip */}
                                            {(isHovered || isSelected) && (
                                                <Box
                                                    position="absolute"
                                                    attributes={{
                                                        style: {
                                                            bottom: '100%',
                                                            marginBottom: '8px',
                                                            background: '#1A1A1A',
                                                            color: 'white',
                                                            padding: '12px',
                                                            borderRadius: '8px',
                                                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                                                            whiteSpace: 'nowrap',
                                                            zIndex: 20,
                                                            border: `1px solid ${akashPrimary}`
                                                        }
                                                    }}
                                                >
                                                    <div style={{ marginBottom: '0.25rem' }}>
                                                        <Text fontSize="$xs" fontWeight="$semibold" color={akashPrimary}>
                                                            Rank #{holder.rank}
                                                        </Text>
                                                    </div>
                                                    <div style={{ marginBottom: '0.25rem' }}>
                                                        <Text fontSize="$sm" fontFamily="monospace">
                                                            {holder.address}
                                                        </Text>
                                                    </div>
                                                    <div style={{ marginBottom: '0.25rem' }}>
                                                        <Text fontSize="$sm" fontWeight="$bold">
                                                            {formatBalance(holder.balance)} AKT
                                                        </Text>
                                                    </div>
                                                    <Text fontSize="$xs" color={textSecondary}>
                                                        {holder.percentage.toFixed(2)}% of supply
                                                    </Text>
                                                    <Box
                                                        attributes={{
                                                            style: {
                                                                position: 'absolute',
                                                                bottom: 0,
                                                                left: '50%',
                                                                transform: 'translate(-50%, 100%)',
                                                                width: 0,
                                                                height: 0,
                                                                borderLeft: '8px solid transparent',
                                                                borderRight: '8px solid transparent',
                                                                borderTop: '8px solid #1A1A1A'
                                                            }
                                                        }}
                                                    />
                                                </Box>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    </div>
                )}

                {/* Legend */}
                {holders.length > 0 && (
                    <Box
                        backgroundColor="rgba(255, 65, 76, 0.05)"
                        borderRadius="$lg"
                        p="$10"
                        border="1px solid rgba(255, 65, 76, 0.2)"
                    >
                        <div style={{ marginBottom: '1.5rem' }}>
                            <Text color={textColor} fontWeight="$semibold" fontSize="$lg">
                                Top {holders.length} Holders
                            </Text>
                        </div>
                        <Box
                            display="grid"
                            gridTemplateColumns={{ mobile: '1fr', tablet: 'repeat(2, 1fr)', desktop: 'repeat(3, 1fr)' }}
                            gap="$4"
                        >
                            {holders.map((holder) => (
                                <Box
                                    key={holder.address}
                                    display="flex"
                                    alignItems="center"
                                    gap="$4"
                                    p="$3"
                                    borderRadius="$md"
                                    cursor="pointer"
                                    backgroundColor={hoveredHolder === holder.address ? cardBg : 'transparent'}
                                    attributes={{
                                        style: { transition: 'background-color 0.2s' },
                                        onMouseEnter: () => setHoveredHolder(holder.address),
                                        onMouseLeave: () => setHoveredHolder(null),
                                        onClick: () => setSelectedHolder(selectedHolder === holder.address ? null : holder.address)
                                    }}
                                >
                                    <Box
                                        width="16px"
                                        height="16px"
                                        borderRadius="$full"
                                        flexShrink={0}
                                        attributes={{
                                            style: { backgroundColor: getColor(holder.rank - 1) }
                                        }}
                                    />
                                    <Box flex={1} minWidth={0} display="flex" alignItems="center" justifyContent="space-between" gap="$3">
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <Text
                                                color={textColor}
                                                fontSize="$sm"
                                                fontFamily="monospace"
                                            >
                                                #{holder.rank} {holder.address}
                                            </Text>
                                        </span>
                                        <span style={{ whiteSpace: 'nowrap' }}>
                                            <Text color={akashPrimary} fontSize="$sm" fontWeight="$semibold">
                                                {holder.percentage.toFixed(1)}%
                                            </Text>
                                        </span>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Instructions */}
                <div style={{ marginTop: '2.5rem' }}>
                    <Box textAlign="center" color={textSecondary} fontSize="$sm">
                        <Text>
                            Hover over bubbles to see details • Click to pin selection • Larger bubbles = more tokens
                        </Text>
                    </Box>
                </div>
            </Box>
        </div>
    );
};

export default TopHoldersBubbleMap;