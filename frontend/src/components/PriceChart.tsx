import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  LineChart,
} from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';

import { PricePoint } from '@player-stock-market/shared';
import { theme } from '../theme/theme';

interface PriceChartProps {
  data: PricePoint[];
  width?: number;
  height?: number;
  showGrid?: boolean;
  isPositive?: boolean;
  sparkline?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export default function PriceChart({
  data,
  width = screenWidth - 40,
  height = 180,
  showGrid = false,
  isPositive = true,
  sparkline = false,
}: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <View style={styles.placeholder} />
      </View>
    );
  }

  // Prepare data for chart
  const prices = data.map(point => point.price);
  const labels = sparkline ? [] : data.map((point, index) => {
    if (index % Math.ceil(data.length / 6) === 0) {
      const date = new Date(point.timestamp);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
    return '';
  }).filter(label => label !== '');

  const chartColor = isPositive ? theme.colors.bullish : theme.colors.bearish;
  const gradientFrom = chartColor + '40';
  const gradientTo = chartColor + '10';

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    fillShadowGradientFrom: gradientFrom,
    fillShadowGradientTo: gradientTo,
    fillShadowGradientFromOpacity: 0.7,
    fillShadowGradientToOpacity: 0.1,
    color: () => chartColor,
    strokeWidth: sparkline ? 3 : 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 2,
    propsForDots: {
      r: sparkline ? '0' : '4',
      strokeWidth: sparkline ? '0' : '2',
      stroke: chartColor,
      fill: theme.colors.surface,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: showGrid ? theme.colors.outline : 'transparent',
      strokeWidth: 0.5,
    },
    propsForLabels: {
      fontSize: sparkline ? 0 : 10,
      fontWeight: '500',
      fill: theme.colors.neutral,
    },
    style: {
      borderRadius: 0,
    },
  };

  const chartData = {
    labels: sparkline ? [''] : labels,
    datasets: [
      {
        data: prices,
        color: () => chartColor,
        strokeWidth: sparkline ? 3 : 2,
      },
    ],
  };

  return (
    <View style={[styles.container, { width, height }]}>
      {sparkline ? (
        <View style={styles.sparklineContainer}>
          <LineChart
            data={chartData}
            width={width}
            height={height}
            chartConfig={chartConfig}
            bezier={true}
            withHorizontalLabels={false}
            withVerticalLabels={false}
            withDots={false}
            withShadow={true}
            withScrollableDot={false}
            withInnerLines={false}
            withOuterLines={false}
            withHorizontalLines={false}
            withVerticalLines={false}
            style={styles.sparklineChart}
          />
        </View>
      ) : (
        <LineChart
          data={chartData}
          width={width}
          height={height}
          chartConfig={chartConfig}
          bezier={true}
          withDots={true}
          withShadow={true}
          withScrollableDot={false}
          withInnerLines={showGrid}
          withOuterLines={false}
          style={styles.chart}
        />
      )}
    </View>
  );
}

// Mini sparkline component for cards
export function MiniSparkline({
  data,
  isPositive = true,
  width = 80,
  height = 30,
}: {
  data: PricePoint[];
  isPositive?: boolean;
  width?: number;
  height?: number;
}) {
  return (
    <PriceChart
      data={data}
      width={width}
      height={height}
      isPositive={isPositive}
      sparkline={true}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    opacity: 0.3,
  },
  chart: {
    borderRadius: 0,
  },
  sparklineContainer: {
    overflow: 'hidden',
    borderRadius: 4,
  },
  sparklineChart: {
    marginLeft: -16,
    marginRight: -16,
    marginTop: -8,
    marginBottom: -8,
    borderRadius: 0,
  },
});