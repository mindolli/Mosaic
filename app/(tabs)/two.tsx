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

  // 폴더 목록 조회 (fetchMosaics): Supabase 클라우드 DB에서 내가 만든 Mosaic 목록을 최신순으로 가져옵니다.
  const fetchMosaics = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('mosaics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setMosaics(data || []);
      // If no selected mosaic and we have mosaics, maybe select the first one?
      // Or just keep it null.
    }
    setLoading(false);
  };

  // 새 폴더 생성 (createMosaic): 입력창에 이름을 쓰고 버튼을 누르면 즉시 DB에 저장하고 목록에 추가합니다.
  const createMosaic = async () => {
    if (!newMosaicName.trim() || !user) return;
    setIsCreating(true);
    
    // Optimistic update could be added here, but for simplicity:
    const { data, error } = await supabase
      .from('mosaics')
      .insert([{ user_id: user.id, name: newMosaicName.trim() }])
      .select()
      .single();

    if (error) {
      Alert.alert('Error creating mosaic', error.message);
    } else {
      setMosaics([data, ...mosaics]);
      setNewMosaicName('');
      // Auto select newly created mosaic
      selectMosaic(data.id);
    }
    setIsCreating(false);
  };

  //삭제 (deleteMosaic): 휴지통 아이콘을 눌러 폴더를 삭제할 수 있습니다.
  const deleteMosaic = async (id: string) => {
    Alert.alert('Delete Mosaic', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          const { error } = await supabase.from('mosaics').delete().eq('id', id);
          if (error) Alert.alert('Error', error.message);
          else {
            setMosaics(mosaics.filter(m => m.id !== id));
            if (selectedMosaicId === id) {
              setSelectedMosaicId(null);
              AsyncStorage.removeItem(RECENT_MOSAIC_KEY);
            }
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
      <View style={styles.itemContent}>
        <FontAwesome name="folder-o" size={20} color={selectedMosaicId === item.id ? Colors[colorScheme ?? 'light'].tint : '#888'} style={{ marginRight: 10 }} />
        <Text style={styles.itemText}>{item.name}</Text>
      </View>
      <TouchableOpacity onPress={() => deleteMosaic(item.id)} style={styles.deleteBtn}>
        <FontAwesome name="trash-o" size={16} color="#ff4444" />
      </TouchableOpacity>
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
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#888',
  },
});
