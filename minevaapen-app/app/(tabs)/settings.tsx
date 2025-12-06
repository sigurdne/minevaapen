import { ReactNode, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOrganizations, type Organization } from '@/src/hooks/use-organizations';
import {
  backupDatabase,
  exportWeaponsToCsv,
  restoreDatabase,
  restoreDatabaseFromUri,
} from '@/src/services/storage';

type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

type ActionState = {
  status: ActionStatus;
  message: string | null;
};

const initialState: ActionState = { status: 'idle', message: null };

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const [backupState, setBackupState] = useState<ActionState>(initialState);
  const [lastBackupPath, setLastBackupPath] = useState<string | null>(null);
  const [exportState, setExportState] = useState<ActionState>(initialState);
  const [restoreState, setRestoreState] = useState<ActionState>(initialState);
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);
  const [languageState, setLanguageState] = useState<ActionState>(initialState);
  const [membershipState, setMembershipState] = useState<ActionState>(initialState);
  const [pendingOrganizationId, setPendingOrganizationId] = useState<string | null>(null);

  const {
    organizations,
    loading: organizationsLoading,
    error: organizationsError,
    updateMembership,
    updateAllMemberships,
    updating: membershipsUpdating,
  } = useOrganizations();

  const handleBackup = useCallback(async () => {
    setBackupState({ status: 'loading', message: null });

    try {
      const path = await backupDatabase();
      setBackupState({
        status: 'success',
        message: t('settings.backup.success', { path }),
      });
      setLastBackupPath(path);
    } catch (error) {
      console.warn('Database backup failed', error);
      setBackupState({
        status: 'error',
        message: t('settings.backup.error'),
      });
      setLastBackupPath(null);
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

  const handleRestoreFromFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      setRestoreState({ status: 'loading', message: null });

      const asset = result.assets[0];
      await restoreDatabaseFromUri(asset.uri);

      setRestoreState({
        status: 'success',
        message: t('settings.restore.success', { path: asset.name }),
      });
    } catch (error) {
      console.warn('Database restore from file failed', error);
      setRestoreState({
        status: 'error',
        message: t('settings.restore.error'),
      });
    }
  }, [t]);

  const handleShareBackup = useCallback(async () => {
    if (!lastBackupPath) {
      return;
    }

    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        setBackupState({
          status: 'error',
          message: t('settings.backup.shareUnavailable'),
        });
        return;
      }

      await Sharing.shareAsync(lastBackupPath, {
        dialogTitle: t('settings.backup.shareDialogTitle'),
        mimeType: 'application/x-sqlite3',
      });
    } catch (error) {
      console.warn('Backup share failed', error);
      setBackupState({
        status: 'error',
        message: t('settings.backup.shareError'),
      });
    }
  }, [lastBackupPath, t]);

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

  const memberCount = useMemo(
    () => organizations.filter((org) => org.isMember).length,
    [organizations]
  );

  const membershipSummary = useMemo(() => {
    if (!organizations.length) {
      return t('settings.memberships.empty');
    }

    return t('settings.memberships.selectedCount', {
      count: memberCount,
      total: organizations.length,
    });
  }, [memberCount, organizations.length, t]);

  const membershipControlsDisabled = membershipsUpdating || Boolean(pendingOrganizationId);

  const handleToggleMembership = useCallback(
    async (organizationId: string, nextValue: boolean) => {
      if (membershipControlsDisabled && pendingOrganizationId !== organizationId) {
        return;
      }

      setPendingOrganizationId(organizationId);
      setMembershipState(initialState);

      try {
        await updateMembership(organizationId, nextValue);
        setMembershipState({
          status: 'success',
          message: t('settings.memberships.updateSuccess'),
        });
      } catch (error) {
        console.warn('Failed to toggle membership', error);
        setMembershipState({
          status: 'error',
          message: t('settings.memberships.updateError'),
        });
      } finally {
        setPendingOrganizationId((current) => (current === organizationId ? null : current));
      }
    },
    [membershipControlsDisabled, pendingOrganizationId, t, updateMembership]
  );

  const handleSetAllMemberships = useCallback(
    async (isMember: boolean) => {
      setMembershipState(initialState);
      try {
        await updateAllMemberships(isMember);
        setMembershipState({
          status: 'success',
          message: t('settings.memberships.updateSuccess'),
        });
      } catch (error) {
        console.warn('Failed to update all memberships', error);
        setMembershipState({
          status: 'error',
          message: t('settings.memberships.updateError'),
        });
      }
    },
    [t, updateAllMemberships]
  );

  const handleSelectAllMemberships = useCallback(() => {
    void handleSetAllMemberships(true);
  }, [handleSetAllMemberships]);

  const handleSelectNoMemberships = useCallback(() => {
    void handleSetAllMemberships(false);
  }, [handleSetAllMemberships]);

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
          secondaryAction={{
            label: t('settings.backup.shareButton'),
            onPress: handleShareBackup,
            disabled: !lastBackupPath || backupState.status === 'loading',
            icon: <Feather name="share-2" size={18} color="#2563eb" />,
          }}
        />

        <ActionCard
          title={t('settings.restore.title')}
          description={t('settings.restore.description')}
          buttonLabel={t('settings.restore.button')}
          state={restoreState}
          onPress={handleRestore}
          secondaryAction={{
            label: t('settings.restore.fileButton'),
            onPress: handleRestoreFromFile,
            disabled: restoreState.status === 'loading',
            icon: <Feather name="folder" size={18} color="#2563eb" />,
          }}
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

        <MembershipCard
          title={t('settings.memberships.title')}
          description={t('settings.memberships.description')}
          summary={membershipSummary}
          organizations={organizations}
          loading={organizationsLoading}
          error={organizationsError}
          state={membershipState}
          disabled={membershipControlsDisabled || organizationsLoading}
          pendingOrganizationId={pendingOrganizationId}
          onToggleMembership={handleToggleMembership}
          onSelectAll={handleSelectAllMemberships}
          onSelectNone={handleSelectNoMemberships}
          selectAllLabel={t('settings.memberships.selectAll')}
          selectNoneLabel={t('settings.memberships.selectNone')}
          emptyLabel={t('settings.memberships.empty')}
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

type MembershipCardProps = {
  title: string;
  description: string;
  summary: string;
  organizations: Organization[];
  loading: boolean;
  error: Error | null;
  state: ActionState;
  disabled: boolean;
  pendingOrganizationId: string | null;
  onToggleMembership: (organizationId: string, nextValue: boolean) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  selectAllLabel: string;
  selectNoneLabel: string;
  emptyLabel: string;
};

function MembershipCard({
  title,
  description,
  summary,
  organizations,
  loading,
  error,
  state,
  disabled,
  pendingOrganizationId,
  onToggleMembership,
  onSelectAll,
  onSelectNone,
  selectAllLabel,
  selectNoneLabel,
  emptyLabel,
}: MembershipCardProps) {
  const isSuccess = state.status === 'success';
  const isError = state.status === 'error';

  return (
    <ThemedView style={styles.membershipCard} lightColor="#ffffff" darkColor="rgba(255,255,255,0.05)">
      <ThemedText type="subtitle" style={styles.cardTitle}>
        {title}
      </ThemedText>
      <ThemedText style={styles.cardDescription}>{description}</ThemedText>
      <ThemedText style={styles.membershipSummary}>{summary}</ThemedText>

      <View style={styles.membershipActions}>
        <Pressable
          style={[styles.membershipActionButton, disabled && styles.cardButtonDisabled]}
          onPress={onSelectAll}
          disabled={disabled}
        >
          <ThemedText style={styles.cardButtonLabel}>{selectAllLabel}</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.membershipActionButton, disabled && styles.cardButtonDisabled]}
          onPress={onSelectNone}
          disabled={disabled}
        >
          <ThemedText style={styles.cardButtonLabel}>{selectNoneLabel}</ThemedText>
        </Pressable>
      </View>

      <View style={styles.membershipList}>
        {loading ? (
          <ActivityIndicator />
        ) : error ? (
          <ThemedText style={[styles.cardStatus, styles.cardStatusError]}>
            {error.message}
          </ThemedText>
        ) : organizations.length === 0 ? (
          <ThemedText style={styles.cardDescription}>{emptyLabel}</ThemedText>
        ) : (
          organizations.map((organization) => (
            <View key={organization.id} style={styles.membershipRow}>
              <View style={styles.membershipInfo}>
                <ThemedText style={styles.membershipName}>{organization.name}</ThemedText>
                <ThemedText style={styles.membershipShort}>{organization.shortName}</ThemedText>
              </View>
              <Switch
                value={organization.isMember}
                onValueChange={(nextValue) => onToggleMembership(organization.id, nextValue)}
                disabled={disabled || pendingOrganizationId === organization.id}
              />
            </View>
          ))
        )}
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
  membershipSummary: {
    fontWeight: '600',
  },
  membershipCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  membershipActions: {
    flexDirection: 'row',
    gap: 12,
  },
  membershipActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    alignItems: 'center',
  },
  membershipList: {
    gap: 12,
  },
  membershipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  membershipInfo: {
    flex: 1,
  },
  membershipName: {
    fontWeight: '600',
  },
  membershipShort: {
    opacity: 0.7,
  },
});
