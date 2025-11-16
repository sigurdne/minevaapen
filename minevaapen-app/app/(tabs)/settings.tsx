import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { backupDatabase, exportWeaponsToCsv } from '@/src/services/storage';

type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

type ActionState = {
  status: ActionStatus;
  message: string | null;
};

const initialState: ActionState = { status: 'idle', message: null };

export default function SettingsScreen() {
  const { t } = useTranslation();
  const [backupState, setBackupState] = useState<ActionState>(initialState);
  const [exportState, setExportState] = useState<ActionState>(initialState);

  const handleBackup = useCallback(async () => {
    setBackupState({ status: 'loading', message: null });

    try {
      const path = await backupDatabase();
      setBackupState({
        status: 'success',
        message: t('settings.backup.success', { path }),
      });
    } catch (error) {
      console.warn('Database backup failed', error);
      setBackupState({
        status: 'error',
        message: t('settings.backup.error'),
      });
    }
  }, [t]);

  const handleExport = useCallback(async () => {
    setExportState({ status: 'loading', message: null });

    try {
      const path = await exportWeaponsToCsv();
      setExportState({
        status: 'success',
        message: t('settings.export.success', { path }),
      });
    } catch (error) {
      console.warn('Weapon CSV export failed', error);
      setExportState({
        status: 'error',
        message: t('settings.export.error'),
      });
    }
  }, [t]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          {t('settings.title')}
        </ThemedText>
        <ThemedText style={styles.subtitle}>{t('settings.subtitle')}</ThemedText>
      </View>

      <ActionCard
        title={t('settings.backup.title')}
        description={t('settings.backup.description')}
        buttonLabel={t('settings.backup.button')}
        state={backupState}
        onPress={handleBackup}
      />

      <ActionCard
        title={t('settings.export.title')}
        description={t('settings.export.description')}
        buttonLabel={t('settings.export.button')}
        state={exportState}
        onPress={handleExport}
      />
    </ThemedView>
  );
}

type ActionCardProps = {
  title: string;
  description: string;
  buttonLabel: string;
  state: ActionState;
  onPress: () => void;
};

function ActionCard({ title, description, buttonLabel, state, onPress }: ActionCardProps) {
  const isLoading = state.status === 'loading';
  const isSuccess = state.status === 'success';
  const isError = state.status === 'error';

  return (
    <ThemedView style={styles.card} lightColor="#ffffff" darkColor="rgba(255,255,255,0.05)">
      <ThemedText type="subtitle" style={styles.cardTitle}>
        {title}
      </ThemedText>
      <ThemedText style={styles.cardDescription}>{description}</ThemedText>

      <Pressable
        onPress={onPress}
        style={[styles.cardButton, isLoading && styles.cardButtonDisabled]}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" />
        ) : (
          <ThemedText style={styles.cardButtonLabel}>{buttonLabel}</ThemedText>
        )}
      </Pressable>

      {state.message ? (
        <ThemedText
          style={[
            styles.cardStatus,
            isSuccess && styles.cardStatusSuccess,
            isError && styles.cardStatusError,
          ]}
        >
          {state.message}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 16,
  },
  header: {
    gap: 8,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  cardTitle: {
    marginBottom: 4,
  },
  cardDescription: {
    opacity: 0.8,
  },
  cardButton: {
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    alignItems: 'center',
  },
  cardButtonDisabled: {
    opacity: 0.6,
  },
  cardButtonLabel: {
    fontWeight: '600',
  },
  cardStatus: {
    fontSize: 14,
    opacity: 0.8,
  },
  cardStatusSuccess: {
    color: '#15803d',
  },
  cardStatusError: {
    color: '#b91c1c',
  },
});
