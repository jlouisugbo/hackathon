import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  FlatList,
} from 'react-native';
import {
  Text,
  TextInput,
  IconButton,
  Surface,
  Button,
  Chip,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from '../context/SocketContext';
import { theme } from '../theme/theme';
import { formatCurrency } from '../utils/formatters';

const { width, height } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  type: 'user' | 'system' | 'trade';
}

interface TradeFeedItem {
  id: string;
  username: string;
  playerName: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  timestamp: number;
  marketImpact?: {
    priceImpact: number;
    priceImpactPercent: number;
    impactLevel: 'minimal' | 'moderate' | 'significant' | 'major';
    description?: string;
  };
}

interface LiveChatProps {
  visible: boolean;
  onClose: () => void;
}

export default function LiveChat({ visible, onClose }: LiveChatProps) {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tradeFeed, setTradeFeed] = useState<TradeFeedItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'trades'>('chat');
  const scrollViewRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!socket || !visible) return;

    // Listen for chat messages
    const handleChatMessage = (message: ChatMessage) => {
      setMessages(prev => {
        // Deduplicate consecutive messages with same id and content
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          if (last.id === message.id && last.message === message.message) {
            return prev;
          }
        }
        return [...prev, message].slice(-50);
      });
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      // Dispatch notification event if chat is closed
      if (!visible && typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('livechat:new_message'));
      }
    };

    // Listen for trade feed updates
    const handleTradeFeed = (trade: TradeFeedItem) => {
      setTradeFeed(prev => [...prev, trade].slice(-20)); // Keep last 20 trades

      // Add trade announcement to chat if significant
      if (trade.marketImpact && trade.marketImpact.impactLevel !== 'minimal') {
        const tradeMessage: ChatMessage = {
          id: `trade-${trade.id}`,
          userId: 'system',
          username: 'Market Bot',
          message: `💰 ${trade.username} ${trade.type === 'buy' ? 'bought' : 'sold'} ${trade.shares} shares of ${trade.playerName} ${trade.marketImpact.description ? `- ${trade.marketImpact.description}` : ''}`,
          timestamp: trade.timestamp,
          type: 'trade'
        };
        setMessages(prev => [...prev, tradeMessage].slice(-50));
      }
    };

    // Listen for market impact events
    const handleMarketImpact = (impact: any) => {
      const impactMessage: ChatMessage = {
        id: `impact-${Date.now()}`,
        userId: 'system',
        username: 'Market Alert',
        message: `📈 ${impact.description} - Price impact: ${impact.priceImpactPercent > 0 ? '+' : ''}${impact.priceImpactPercent.toFixed(2)}%`,
        timestamp: impact.timestamp,
        type: 'system'
      };
      setMessages(prev => [...prev, impactMessage].slice(-50));
    };

    // Listen for game events
    const handleGameEvent = (event: any) => {
      const gameMessage: ChatMessage = {
        id: `game-${event.id}`,
        userId: 'system',
        username: 'Game Update',
        message: `🏀 ${event.description}`,
        timestamp: event.timestamp,
        type: 'system'
      };
      setMessages(prev => {
        // Prevent duplicates: ignore if a message with same id already exists
        if (prev.some(m => m.id === gameMessage.id)) return prev;
        const next = [...prev, gameMessage].slice(-50);
        // scroll to bottom shortly after adding
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return next;
      });
    };

    socket.on('chat_message', handleChatMessage);
    socket.on('trade_feed', handleTradeFeed);
    socket.on('market_impact', handleMarketImpact);
    socket.on('game_event', handleGameEvent);

    return () => {
      socket.off('chat_message', handleChatMessage);
      socket.off('trade_feed', handleTradeFeed);
      socket.off('market_impact', handleMarketImpact);
      socket.off('game_event', handleGameEvent);
    };
  }, [socket, visible]);

  const sendMessage = () => {
    if (!socket || !inputMessage.trim()) return;

    socket.emit('send_chat_message', inputMessage.trim());
    setInputMessage('');
  };

  const renderChatMessage = ({ item }: { item: ChatMessage }) => (
    <Surface style={[
      styles.messageContainer,
      item.type === 'system' && styles.systemMessage,
      item.type === 'trade' && styles.tradeMessage
    ]}>
      <View style={styles.messageHeader}>
        <Text style={[
          styles.username,
          item.type === 'system' && styles.systemUsername,
          item.type === 'trade' && styles.tradeUsername
        ]}>
          {item.username}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
      <Text style={styles.messageText}>{item.message}</Text>
    </Surface>
  );

  const renderTradeItem = ({ item }: { item: TradeFeedItem }) => (
    <Surface style={styles.tradeItem}>
      <View style={styles.tradeHeader}>
        <View style={styles.tradeLeft}>
          <Text style={styles.tradeUsername}>{item.username}</Text>
          <Chip
            mode="outlined"
            style={[
              styles.tradeTypeChip,
              { backgroundColor: item.type === 'buy' ? theme.colors.bullish + '20' : theme.colors.bearish + '20' }
            ]}
            textStyle={{
              color: item.type === 'buy' ? theme.colors.bullish : theme.colors.bearish,
              fontSize: 12
            }}
          >
            {item.type.toUpperCase()}
          </Chip>
        </View>
        <Text style={styles.tradeTime}>
          {new Date(item.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
      <View style={styles.tradeDetails}>
        <Text style={styles.tradePlayer}>{item.playerName}</Text>
        <Text style={styles.tradeAmount}>
          {item.shares} shares @ {formatCurrency(item.price)}
        </Text>
        {item.marketImpact && item.marketImpact.impactLevel !== 'minimal' && (
          <Chip
            mode="outlined"
            style={styles.impactChip}
            textStyle={styles.impactText}
          >
            {item.marketImpact.priceImpactPercent > 0 ? '+' : ''}{item.marketImpact.priceImpactPercent.toFixed(2)}%
          </Chip>
        )}
      </View>
    </Surface>
  );

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      style={styles.overlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Surface style={styles.chatContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="chatbubbles" size={24} color={theme.colors.primary} />
            <Text style={styles.headerTitle}>Live Chat</Text>
            <View style={[
              styles.connectionDot,
              { backgroundColor: isConnected ? theme.colors.bullish : theme.colors.error }
            ]} />
          </View>
          <IconButton
            icon="close"
            size={24}
            onPress={onClose}
            style={styles.closeButton}
          />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <Button
            mode={activeTab === 'chat' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('chat')}
            style={styles.tabButton}
            compact
          >
            Chat ({messages.length})
          </Button>
          <Button
            mode={activeTab === 'trades' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('trades')}
            style={styles.tabButton}
            compact
          >
            Trades ({tradeFeed.length})
          </Button>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {activeTab === 'chat' ? (
            <FlatList
              ref={scrollViewRef}
              data={messages}
              renderItem={renderChatMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            />
          ) : (
            <FlatList
              data={tradeFeed}
              renderItem={renderTradeItem}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Input */}
        {activeTab === 'chat' && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              value={inputMessage}
              onChangeText={setInputMessage}
              onSubmitEditing={sendMessage}
              multiline={false}
              mode="outlined"
              dense
              disabled={!isConnected}
            />
            <IconButton
              icon="send"
              size={20}
              onPress={sendMessage}
              disabled={!isConnected || !inputMessage.trim()}
              style={styles.sendButton}
            />
          </View>
        )}
      </Surface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  chatContainer: {
    width: width * 0.9,
    height: height * 0.8,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline + '40',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  closeButton: {
    margin: 0,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline + '20',
  },
  tabButton: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceVariant,
  },
  systemMessage: {
    backgroundColor: theme.colors.primary + '20',
  },
  tradeMessage: {
    backgroundColor: theme.colors.secondary + '20',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  systemUsername: {
    color: theme.colors.primary,
  },
  tradeUsername: {
    color: theme.colors.secondary,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.onSurface + '60',
  },
  messageText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    lineHeight: 18,
  },
  tradeItem: {
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceVariant,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tradeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tradeTypeChip: {
    height: 24,
  },
  tradeTime: {
    fontSize: 12,
    color: theme.colors.onSurface + '60',
  },
  tradeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tradePlayer: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
    flex: 1,
  },
  tradeAmount: {
    fontSize: 12,
    color: theme.colors.onSurface + '80',
    marginRight: 8,
  },
  impactChip: {
    height: 24,
  },
  impactText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline + '40',
    gap: 8,
  },
  textInput: {
    flex: 1,
    maxHeight: 80,
  },
  sendButton: {
    margin: 0,
  },
});