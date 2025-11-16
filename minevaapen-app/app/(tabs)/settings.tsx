import { ReactNode, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { backupDatabase, exportWeaponsToCsv, restoreDatabase } from '@/src/services/storage';

type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

type ActionState = {
  status: ActionStatus;
  message: string | null;
};

const initialState: ActionState = { status: 'idle', message: null };

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const [backupState, setBackupState] = useState<ActionState>(initialState);
  const [exportState, setExportState] = useState<ActionState>(initialState);
  const [restoreState, setRestoreState] = useState<ActionState>(initialState);
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);
  const [languageState, setLanguageState] = useState<ActionState>(initialState);

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
      setLastExportPath(path);
    } catch (error) {
      console.warn('Weapon CSV export failed', error);
      setExportState({
        status: 'error',
        message: t('settings.export.error'),
      });
      setLastExportPath(null);
    }
  }, [t]);

  const handleRestore = useCallback(async () => {
    setRestoreState({ status: 'loading', message: null });

    try {
      const backup = await restoreDatabase();
      setRestoreState({
        status: 'success',
        message: t('settings.restore.success', { path: backup.path }),
      });
    } catch (error) {
      console.warn('Database restore failed', error);
      setRestoreState({
        status: 'error',
        message: t('settings.restore.error'),
      });
    }
  }, [t]);

  const handleShareExport = useCallback(async () => {
    if (!lastExportPath) {
      return;
    }

    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        setExportState({
          status: 'error',
          message: t('settings.export.shareUnavailable'),
        });
        return;
      }

      await Sharing.shareAsync(lastExportPath, {
        dialogTitle: t('settings.export.shareDialogTitle'),
        mimeType: 'text/csv',
      });
    } catch (error) {
      console.warn('Weapon CSV share failed', error);
      setExportState({
        status: 'error',
        message: t('settings.export.shareError'),
      });
    }
  }, [lastExportPath, t]);

  const supportedLanguages = useMemo(
    () =>
      [
        { code: 'nb_NO', labelKey: 'settings.language.options.nb_NO' as const },
        { code: 'nn_NO', labelKey: 'settings.language.options.nn_NO' as const },
      ] as const,
    []
  );

  const currentLanguage = i18n.language;

  const getTranslation = useCallback(
    (key: 'settings.language.options.nb_NO' | 'settings.language.options.nn_NO') => t(key),
    [t]
  );

  const handleChangeLanguage = useCallback(
    async (language: string) => {
      if (language === i18n.language) {
        return;
      }

      setLanguageState({ status: 'loading', message: null });

      try {
        await i18n.changeLanguage(language);
        setLanguageState({
          status: 'success',
          message: t('settings.language.success'),
        });
      } catch (error) {
        console.warn('Language change failed', error);
        setLanguageState({
          status: 'error',
          message: t('settings.language.error'),
        });
      }
    },
    [i18n, t]
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
          title={t('settings.restore.title')}
          description={t('settings.restore.description')}
          buttonLabel={t('settings.restore.button')}
          state={restoreState}
          onPress={handleRestore}
        />

        <ActionCard
          title={t('settings.export.title')}
          description={t('settings.export.description')}
          buttonLabel={t('settings.export.button')}
          state={exportState}
          onPress={handleExport}
          secondaryAction={{
            label: t('settings.export.shareButton'),
            onPress: handleShareExport,
            disabled: !lastExportPath || exportState.status === 'loading',
            icon: <Feather name="share-2" size={18} color="#2563eb" />,
          }}
        />

        <ThemedView style={styles.languageCard} lightColor="#ffffff" darkColor="rgba(255,255,255,0.05)">
          <ThemedText type="subtitle" style={styles.cardTitle}>
            {t('settings.language.title')}
          </ThemedText>
          <ThemedText style={styles.cardDescription}>{t('settings.language.description')}</ThemedText>

          <View style={styles.languageOptions}>
            {supportedLanguages.map((option) => {
              const isSelected = option.code === currentLanguage;
              const isLoading = languageState.status === 'loading' && isSelected;

              return (
                <Pressable
                  key={option.code}
                  onPress={() => handleChangeLanguage(option.code)}
                  disabled={languageState.status === 'loading'}
                  style={[styles.languageButton, isSelected && styles.languageButtonSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, busy: isLoading }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <ThemedText
                      style={[styles.languageButtonLabel, isSelected && styles.languageButtonLabelSelected]}
                    >
                      {getTranslation(option.labelKey)}
                    </ThemedText>
                  )}
                </Pressable>
              );
            })}
          </View>

          {languageState.message ? (
            <ThemedText
              style={[
                styles.cardStatus,
                languageState.status === 'success' && styles.cardStatusSuccess,
                languageState.status === 'error' && styles.cardStatusError,
              ]}
            >
              {languageState.message}
            </ThemedText>
          ) : null}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

type ActionCardProps = {
  title: string;
  description: string;
  buttonLabel: string;
  state: ActionState;
  onPress: () => void;
  secondaryAction?: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    icon: ReactNode;
  };
};

function ActionCard({ title, description, buttonLabel, state, onPress, secondaryAction }: ActionCardProps) {
  const isLoading = state.status === 'loading';
  const isSuccess = state.status === 'success';
  const isError = state.status === 'error';
  const secondaryDisabled = secondaryAction?.disabled ?? false;

  return (
    <ThemedView style={styles.card} lightColor="#ffffff" darkColor="rgba(255,255,255,0.05)">
      <ThemedText type="subtitle" style={styles.cardTitle}>
        {title}
      </ThemedText>
      <ThemedText style={styles.cardDescription}>{description}</ThemedText>

      <View style={styles.cardActions}>
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

        {secondaryAction ? (
          <Pressable
            onPress={secondaryAction.onPress}
            style={[styles.cardIconButton, secondaryDisabled && styles.cardButtonDisabled]}
            disabled={secondaryDisabled}
            accessibilityRole="button"
            accessibilityLabel={secondaryAction.label}
          >
            {secondaryAction.icon}
            <ThemedText style={styles.cardIconLabel}>{secondaryAction.label}</ThemedText>
          </Pressable>
        ) : null}
      </View>

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
  },
  scrollContent: {
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
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
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
    flex: 1,
  },
  cardButtonDisabled: {
    opacity: 0.6,
  },
  cardButtonLabel: {
    fontWeight: '600',
  },
  cardIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.4)',
  },
  cardIconLabel: {
    fontWeight: '600',
    color: '#2563eb',
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
  languageCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  languageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.4)',
    alignItems: 'center',
  },
  languageButtonSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    borderColor: '#2563eb',
  },
  languageButtonLabel: {
    fontWeight: '600',
  },
  languageButtonLabelSelected: {
    color: '#2563eb',
  },
});
