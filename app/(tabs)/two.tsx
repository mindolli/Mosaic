import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator, View as RNView } from 'react-native';
import { Text, View } from '../../components/Themed';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import type { Mosaic } from '../../types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '../../constants/Colors';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getLocalMosaics, addLocalMosaic, deleteLocalMosaic, saveLocalMosaics } from '../../lib/database';

const RECENT_MOSAIC_KEY = 'recent_mosaic_id';

export default function MosaicsTab() {
  const { user } = useAuth();
  const [mosaics, setMosaics] = useState<Mosaic[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMosaicName, setNewMosaicName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedMosaicId, setSelectedMosaicId] = useState<string | null>(null);
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (user) {
      fetchMosaics();
      loadRecentMosaic();
    }
  }, [user]);

  const loadRecentMosaic = async () => {
    try {
      const storedId = await AsyncStorage.getItem(RECENT_MOSAIC_KEY);
      if (storedId) setSelectedMosaicId(storedId);
    } catch (e) {
      console.error('Failed to load recent mosaic', e);
    }
  };

  // 폴더 목록 조회 (fetchMosaics): 로컬 DB 우선 조회 후 서버 동기화
  const fetchMosaics = async () => {
    if (!user) return;
    setLoading(true);
    
    // 1. Local First
    try {
      const localData = getLocalMosaics();
      // localData might have is_default as number, coerce to Mosaic[]
      if (localData && localData.length > 0) {
        setMosaics(localData as unknown as Mosaic[]);
      }
    } catch (e) {
      console.log('Local fetch error', e);
    }

    // 2. Network Fetch (Background)
    const { data, error } = await supabase
      .from('mosaics')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMosaics(data);
      saveLocalMosaics(data); // Cache for next time
    }
    setLoading(false);
  };

  // 새 폴더 생성 (createMosaic): 로컬 선반영 -> 서버 후동기화
  const createMosaic = async () => {
    if (!newMosaicName.trim() || !user) return;
    setIsCreating(true);
    
    // 1. Local Optimistic Update
    try {
      const newLocal = addLocalMosaic(newMosaicName.trim(), user.id);
      setMosaics([newLocal, ...mosaics]);
      setNewMosaicName('');
      selectMosaic(newLocal.id);

      // 2. Server Sync
      const { data, error } = await supabase
        .from('mosaics')
        .insert([{ 
           id: newLocal.id, // Use same ID to avoid duplicates if possible, or mapping strategy needed. 
           // Note: Supabase ID is UUID default. If we send ID, we must ensure it matches regex. 
           // Our local ID is UUID from expo-crypto, so it is compatible.
           user_id: user.id, 
           name: newMosaicName.trim() 
        }])
        .select()
        .single();
        
      if (error) {
        console.error('Server sync failed:', error);
        // In a real app, we would mark local item as 'sync_failed'
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setIsCreating(false);
  };

  // 삭제 (deleteMosaic): 로컬 선삭제 -> 서버 후삭제
  const deleteMosaic = async (id: string) => {
    Alert.alert('Delete Mosaic', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          // 1. Local Delete
          try {
            deleteLocalMosaic(id);
            setMosaics(mosaics.filter(m => m.id !== id));
            if (selectedMosaicId === id) {
              setSelectedMosaicId(null);
              AsyncStorage.removeItem(RECENT_MOSAIC_KEY);
            }
            
            // 2. Server Delete
            const { error } = await supabase.from('mosaics').delete().eq('id', id);
            if (error) console.error('Server delete failed', error);
            
          } catch (e: any) {
             Alert.alert('Error', e.message);
          }
        } 
      }
    ]);
  };

  // 폴더 선택 및 기억 (selectMosaic): 폴더를 터치하면 '선택됨' 상태가 되며, 이 정보는 기기 내부(AsyncStorage)에 저장되어 앱을 껐다 켜도 마지막 선택한 폴더가 유지됩니다.
  const selectMosaic = async (id: string) => {
    setSelectedMosaicId(id);
    await AsyncStorage.setItem(RECENT_MOSAIC_KEY, id);
  };

  const renderItem = ({ item }: { item: Mosaic }) => (
    <TouchableOpacity 
      style={[
        styles.item, 
        selectedMosaicId === item.id && { borderColor: Colors[colorScheme ?? 'light'].tint, borderWidth: 2 }
      ]}
      onPress={() => selectMosaic(item.id)}
    >
      <TouchableOpacity onPress={() => deleteMosaic(item.id)} style={styles.deleteBtn}>
        <FontAwesome name="trash-o" size={16} color="#ff4444" />
      </TouchableOpacity>
      
      <FontAwesome 
        name="folder-o" 
        size={32} 
        color={selectedMosaicId === item.id ? Colors[colorScheme ?? 'light'].tint : '#888'} 
        style={{ marginBottom: 12 }} 
      />
      <Text style={styles.itemText} numberOfLines={2}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { color: colorScheme === 'dark' ? '#fff' : '#000', borderColor: colorScheme === 'dark' ? '#444' : '#ddd' }]}
          placeholder="New Mosaic Name..."
          placeholderTextColor="#888"
          value={newMosaicName}
          onChangeText={setNewMosaicName}
        />
        <TouchableOpacity 
          style={[styles.msgBtn, (!newMosaicName.trim() || isCreating) && styles.disabledBtn]}
          onPress={createMosaic}
          disabled={!newMosaicName.trim() || isCreating}
        >
          {isCreating ? <ActivityIndicator size="small" color="#fff" /> : <FontAwesome name="plus" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={mosaics}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          ListEmptyComponent={<Text style={styles.emptyText}>No Mosaics yet. Create one!</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginRight: 10,
    backgroundColor: 'transparent',
  },
  msgBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: '#ccc',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
    gap: 15,
  },
  columnWrapper: {
    gap: 15,
  },
  item: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingTop: 30, // Space for delete button
    borderRadius: 16,
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 140, // Ensure strictly card-like shape
  },
  itemText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 1,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#888',
  },
});
