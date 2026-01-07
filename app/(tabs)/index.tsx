import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text, View } from '../../components/Themed';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import type { Tessera } from '../../types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '../../constants/Colors';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

const RECENT_MOSAIC_KEY = 'recent_mosaic_id';

export default function TesseraeTab() {
  const { user, isLoading: authLoading } = useAuth();
  const [tesserae, setTesserae] = useState<Tessera[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMosaicId, setCurrentMosaicId] = useState<string | null>(null);
  const [currentMosaicName, setCurrentMosaicName] = useState<string>('All Items');
  const [inputText, setInputText] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const colorScheme = useColorScheme();

  // Check selected mosaic from AsyncStorage
  const checkSelectedMosaic = useCallback(async () => {
    if (!user) return;
    try {
      const storedId = await AsyncStorage.getItem(RECENT_MOSAIC_KEY);
      setCurrentMosaicId(storedId);
      if (storedId) {
        const { data } = await supabase.from('mosaics').select('name').eq('id', storedId).single();
        if (data) setCurrentMosaicName(data.name);
      } else {
        setCurrentMosaicName('All Items');
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  // Reload when tab is focused
  useFocusEffect(
    useCallback(() => {
      checkSelectedMosaic();
    }, [checkSelectedMosaic])
  );

  // Fetch tesserae when user or mosaic changes
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        if (!authLoading) setLoading(false);
        return;
      }
      setLoading(true);
      
      let query = supabase
        .from('tesserae')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentMosaicId) {
        query = query.eq('mosaic_id', currentMosaicId);
      }

      const { data, error } = await query;
      if (error) {
        console.error(error);
      } else {
        setTesserae(data || []);
      }
      setLoading(false);
    };
    
    fetchData();
  }, [user, currentMosaicId, authLoading]);

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" style={{ marginTop: 50 }} />
        <Text style={{ textAlign: 'center', marginTop: 10 }}>Signing in...</Text>
      </View>
    );
  }

  const createTessera = async () => {
    if (!inputText.trim() || !user) return;
    setIsCreating(true);

    const isUrl = inputText.startsWith('http');
    const newTessera: Partial<Tessera> = {
      user_id: user.id,
      mosaic_id: currentMosaicId,
      status: 'ready',
    };

    if (isUrl) {
      newTessera.source_url = inputText;
      newTessera.text = '';
      try {
        newTessera.source_domain = new URL(inputText).hostname;
      } catch {
        newTessera.source_domain = 'link';
      }
    } else {
      newTessera.text = inputText;
    }

    const { data, error } = await supabase
      .from('tesserae')
      .insert([newTessera])
      .select()
      .single();

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setTesserae([data, ...tesserae]);
      setInputText('');
    }
    setIsCreating(false);
  };

  const deleteTessera = async (id: string) => {
    const { error } = await supabase.from('tesserae').delete().eq('id', id);
    if (!error) {
      setTesserae(tesserae.filter(t => t.id !== id));
    }
  };

  const renderItem = ({ item }: { item: Tessera }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.domain}>{item.source_domain || 'Note'}</Text>
        <TouchableOpacity onPress={() => deleteTessera(item.id)}>
          <FontAwesome name="times" size={14} color="#ccc" />
        </TouchableOpacity>
      </View>
      
      {item.source_url && (
        <Text style={styles.link} numberOfLines={1}>{item.source_url}</Text>
      )}
      {item.text && (
        <Text style={styles.body} numberOfLines={3}>{item.text}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{currentMosaicName}</Text>
        <Text style={styles.headerSub}>{tesserae.length} items</Text>
      </View>

      {/* Input Area */}
      <View style={[styles.inputContainer, { borderColor: Colors[colorScheme ?? 'light'].text }]}>
        <TextInput
          style={[styles.input, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}
          placeholder="Paste URL or write a note..."
          placeholderTextColor="#888"
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity 
          style={[styles.sendBtn, (!inputText.trim() || isCreating) && styles.disabledBtn]}
          onPress={createTessera}
          disabled={!inputText.trim() || isCreating}
        >
          {isCreating ? <ActivityIndicator color="#fff" /> : <FontAwesome name="arrow-up" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : tesserae.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="inbox" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No items yet</Text>
          <Text style={styles.emptySubText}>Add a URL or note above</Text>
        </View>
      ) : (
        <FlatList
          data={tesserae}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  header: {
    marginBottom: 15,
    paddingHorizontal: 5,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSub: {
    fontSize: 14,
    color: '#888',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 20,
    backgroundColor: 'transparent',
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    height: 40,
    marginRight: 10,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: '#ccc',
  },
  listContent: {
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  domain: {
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  link: {
    fontSize: 12,
    color: '#2f95dc',
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    color: '#888',
  },
  emptySubText: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 5,
  },
});
