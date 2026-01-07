// 저장 화면 (S2)

import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Linking } from 'react-native';
import { Text, View } from '../components/Themed';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Tessera, Mosaic } from '../types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_MOSAIC_KEY = 'recent_mosaic_id';

// URL에서 도메인 추출
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'link';
  }
}

// 텍스트가 URL인지 확인
function isValidUrl(text: string): boolean {
  return text.startsWith('http://') || text.startsWith('https://');
}

export default function SaveScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams<{ url?: string; text?: string }>();

  // 공유로 받은 데이터
  const [sharedUrl, setSharedUrl] = useState<string>(params.url || '');
  const [sharedText, setSharedText] = useState<string>(params.text || '');
  const [note, setNote] = useState('');
  
  // Mosaic 선택
  const [mosaics, setMosaics] = useState<Mosaic[]>([]);
  const [selectedMosaicId, setSelectedMosaicId] = useState<string | null>(null);
  const [loadingMosaics, setLoadingMosaics] = useState(true);
  
  // 저장 상태
  const [isSaving, setIsSaving] = useState(false);

  // 프리뷰 데이터
  const domain = sharedUrl ? extractDomain(sharedUrl) : null;
  const previewContent = sharedUrl || sharedText || '';
  const isUrl = isValidUrl(previewContent);

  useEffect(() => {
    if (user) {
      fetchMosaics();
      loadRecentMosaic();
    }
  }, [user]);

  const loadRecentMosaic = async () => {
    const stored = await AsyncStorage.getItem(RECENT_MOSAIC_KEY);
    if (stored) setSelectedMosaicId(stored);
  };

  const fetchMosaics = async () => {
    const { data, error } = await supabase
      .from('mosaics')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setMosaics(data);
      // 선택된 mosaic이 없으면 첫 번째 선택
      if (!selectedMosaicId && data.length > 0) {
        setSelectedMosaicId(data[0].id);
      }
    }
    setLoadingMosaics(false);
  };

  const selectMosaic = async (id: string) => {
    setSelectedMosaicId(id);
    await AsyncStorage.setItem(RECENT_MOSAIC_KEY, id);
  };

  const handleSave = async () => {
    if (!user || !previewContent.trim()) {
      Alert.alert('Error', 'Nothing to save');
      return;
    }

    setIsSaving(true);

    const newTessera: Partial<Tessera> = {
      user_id: user.id,
      mosaic_id: selectedMosaicId,
      note: note.trim() || null,
      status: 'ready',
    };

    if (isUrl) {
      newTessera.source_url = previewContent;
      newTessera.source_domain = extractDomain(previewContent);
      newTessera.text = '';
    } else {
      newTessera.text = previewContent;
    }

    const { error } = await supabase.from('tesserae').insert([newTessera]);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // 저장 성공 → 홈으로 이동
      router.replace('/');
    }
    setIsSaving(false);
  };

  const handleCancel = () => {
    router.back();
  };

  if (authLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelBtn}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Save</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving || !previewContent.trim()}>
          {isSaving ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text style={[styles.saveBtn, !previewContent.trim() && styles.disabledText]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Preview Card */}
        <View style={styles.previewCard}>
          {domain && (
            <View style={styles.domainBadge}>
              <FontAwesome name="globe" size={12} color="#666" />
              <Text style={styles.domainText}>{domain}</Text>
            </View>
          )}
          
          {isUrl ? (
            <Text style={styles.urlText} numberOfLines={3}>{previewContent}</Text>
          ) : (
            <Text style={styles.textPreview} numberOfLines={5}>{previewContent}</Text>
          )}
          
          {!previewContent && (
            <View style={styles.emptyPreview}>
              <FontAwesome name="share-alt" size={32} color="#ccc" />
              <Text style={styles.emptyText}>Share content from another app</Text>
            </View>
          )}
        </View>

        {/* Direct Input (if no shared content) */}
        {!params.url && !params.text && (
          <View style={styles.inputSection}>
            <Text style={styles.sectionLabel}>URL or Text</Text>
            <TextInput
              style={[styles.textInput, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}
              placeholder="Paste URL or write something..."
              placeholderTextColor="#888"
              value={sharedUrl || sharedText}
              onChangeText={(t) => {
                if (isValidUrl(t)) {
                  setSharedUrl(t);
                  setSharedText('');
                } else {
                  setSharedText(t);
                  setSharedUrl('');
                }
              }}
              multiline
            />
          </View>
        )}

        {/* Note Input */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionLabel}>Note (optional)</Text>
          <TextInput
            style={[styles.textInput, styles.noteInput, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}
            placeholder="Add a note..."
            placeholderTextColor="#888"
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>

        {/* Mosaic Selection */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionLabel}>Save to Mosaic</Text>
          {loadingMosaics ? (
            <ActivityIndicator />
          ) : mosaics.length === 0 ? (
            <Text style={styles.noMosaicText}>No Mosaics yet. Create one first!</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mosaicScroll}>
              {mosaics.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.mosaicChip,
                    selectedMosaicId === m.id && styles.mosaicChipSelected
                  ]}
                  onPress={() => selectMosaic(m.id)}
                >
                  <FontAwesome 
                    name="folder" 
                    size={14} 
                    color={selectedMosaicId === m.id ? '#fff' : '#666'} 
                  />
                  <Text style={[
                    styles.mosaicChipText,
                    selectedMosaicId === m.id && styles.mosaicChipTextSelected
                  ]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  cancelBtn: {
    fontSize: 16,
    color: '#888',
  },
  saveBtn: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledText: {
    color: '#ccc',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  previewCard: {
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    minHeight: 120,
  },
  domainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(128,128,128,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  domainText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  urlText: {
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  textPreview: {
    fontSize: 16,
    lineHeight: 24,
  },
  emptyPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    marginTop: 10,
    color: '#888',
  },
  inputSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    minHeight: 50,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  mosaicScroll: {
    flexDirection: 'row',
  },
  mosaicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(128,128,128,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  mosaicChipSelected: {
    backgroundColor: '#007AFF',
  },
  mosaicChipText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  mosaicChipTextSelected: {
    color: '#fff',
  },
  noMosaicText: {
    color: '#888',
    fontStyle: 'italic',
  },
});
