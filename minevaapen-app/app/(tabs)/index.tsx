import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { WeaponWithPrograms } from '@/src/database/weapons-repository';
import { useOrganizations } from '@/src/hooks/use-organizations';
import { usePrograms } from '@/src/hooks/use-programs';
import { useWeapons } from '@/src/hooks/use-weapons';

type ReserveFilterValue = 'any' | 'reserveOnly' | 'nonReserve';

export default function HomeScreen() {
  const { t } = useTranslation();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [reserveFilter, setReserveFilter] = useState<ReserveFilterValue>('any');
  const [refreshing, setRefreshing] = useState(false);
  const [organizationsExpanded, setOrganizationsExpanded] = useState(false);
  const [programsExpanded, setProgramsExpanded] = useState(false);

  const {
    organizations,
    loading: organizationsLoading,
    error: organizationsError,
  } = useOrganizations();
  const {
    programs,
    loading: programsLoading,
    error: programsError,
    refresh: refreshPrograms,
  } = usePrograms(selectedOrganizationId);
  const {
    weapons,
    loading: weaponsLoading,
    error: weaponsError,
    refresh: refreshWeapons,
  } = useWeapons({
    organizationId: selectedOrganizationId,
    programId: selectedProgramId,
    reserveFilter,
  });

  useFocusEffect(
    useCallback(() => {
      void refreshWeapons();
      void refreshPrograms();
    }, [refreshPrograms, refreshWeapons])
  );

  const colorScheme = useColorScheme();
  const filterHeaderThemeStyle =
    colorScheme === 'dark' ? styles.filterHeaderDark : styles.filterHeaderLight;
  const filterSummaryThemeStyle =
    colorScheme === 'dark' ? styles.filterSummaryDark : styles.filterSummaryLight;

  const organizationOptions = useMemo(
    () => [
      { id: null, label: t('weapons.filters.organizations.all') },
      ...organizations.map((org) => ({
        id: org.id,
        label: org.shortName ? org.shortName : org.name,
      })),
    ],
    [organizations, t]
  );

  const programOptions = useMemo(
    () => [
      { id: null, label: t('weapons.filters.programs.all'), weaponCount: 0, reserveCount: 0 },
      ...programs.map((program) => ({
        id: program.id,
        label: program.name,
        weaponCount: program.weaponCount,
        reserveCount: program.reserveCount,
      })),
    ],
    [programs, t]
  );

  const reserveOptions = useMemo(
    () => [
      { value: 'any' as ReserveFilterValue, label: t('weapons.filters.reserve.any') },
      { value: 'reserveOnly' as ReserveFilterValue, label: t('weapons.filters.reserve.only') },
      { value: 'nonReserve' as ReserveFilterValue, label: t('weapons.filters.reserve.none') },
    ],
    [t]
  );

  const selectedOrganizationLabel = useMemo(() => {
    if (!selectedOrganizationId) {
      return null;
    }

    const match = organizationOptions.find((option) => option.id === selectedOrganizationId);
    return match?.label ?? selectedOrganizationId;
  }, [organizationOptions, selectedOrganizationId]);

  const selectedProgramLabel = useMemo(() => {
    if (!selectedProgramId) {
      return null;
    }

    const match = programOptions.find((option) => option.id === selectedProgramId);
    return match?.label ?? selectedProgramId;
  }, [programOptions, selectedProgramId]);

  const selectedProgramSummary = useMemo(() => {
    if (!selectedProgramId) {
      return null;
    }

    const match = programs.find((program) => program.id === selectedProgramId);
    if (!match) {
      return null;
    }

    return t('weapons.programSummary', {
      name: match.name,
      weaponCount: match.weaponCount,
      reserveCount: match.reserveCount,
    });
  }, [programs, selectedProgramId, t]);

  useEffect(() => {
    if (selectedOrganizationId) {
      setOrganizationsExpanded(true);
    }
  }, [selectedOrganizationId]);

  useEffect(() => {
    if (selectedProgramId) {
      setProgramsExpanded(true);
    }
  }, [selectedProgramId]);

  const isLoading = organizationsLoading || programsLoading || weaponsLoading;
  const error = weaponsError ?? programsError ?? organizationsError;

  const handleSelectOrganization = useCallback(
    (id: string | null) => {
      setSelectedOrganizationId((previous) => {
        const next = previous === id ? null : id;
        return next;
      });
      setSelectedProgramId(null);
    },
    []
  );

  const handleSelectProgram = useCallback((id: string | null) => {
    setSelectedProgramId((previous) => (previous === id ? null : id));
  }, []);

  const handleSelectReserve = useCallback((value: ReserveFilterValue) => {
    setReserveFilter((previous) => (previous === value ? 'any' : value));
  }, []);

  const toggleOrganizationsExpanded = useCallback(() => {
    setOrganizationsExpanded((prev) => !prev);
  }, []);

  const toggleProgramsExpanded = useCallback(() => {
    setProgramsExpanded((prev) => !prev);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshWeapons(), refreshPrograms()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshPrograms, refreshWeapons]);

  const renderWeapon = useCallback(
    ({ item }: { item: WeaponWithPrograms }) => {
      const typeLabel = t(`weapons.types.${item.type}` as const, {
        defaultValue: item.type,
      });

      const manufacturerModel =
        item.manufacturer && item.model
          ? t('weapons.card.manufacturerModel', {
              manufacturer: item.manufacturer,
              model: item.model,
            })
          : item.manufacturer ?? item.model ?? null;

      return (
        <ThemedView
          style={styles.card}
          lightColor="#ffffff"
          darkColor="rgba(255,255,255,0.05)"
        >
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              {item.displayName}
            </ThemedText>
            <ThemedText style={styles.typeBadge}>{typeLabel}</ThemedText>
          </View>

          {manufacturerModel ? (
            <ThemedText style={styles.metaText}>{manufacturerModel}</ThemedText>
          ) : null}

          {item.serialNumber ? (
            <ThemedText style={styles.metaText}>
              {t('weapons.card.serialNumber', { serial: item.serialNumber })}
            </ThemedText>
          ) : null}

          <View style={styles.programsContainer}>
            <ThemedText style={styles.programsTitle}>
              {t('weapons.card.programsTitle')}
            </ThemedText>

            {item.programs.length === 0 ? (
              <ThemedText style={styles.metaText}>{t('weapons.card.noPrograms')}</ThemedText>
            ) : (
              item.programs.map((program) => (
                <View key={`${item.id}-${program.programId}`} style={styles.programRow}>
                  <ThemedText style={styles.programName}>{program.programName}</ThemedText>
                  {program.isReserve ? (
                    <ThemedText style={styles.reserveBadge}>
                      {t('weapons.card.reserveBadge')}
                    </ThemedText>
                  ) : null}
                </View>
              ))
            )}
          </View>

          <View style={styles.cardActions}>
            <Link
              href={{ pathname: '/weapon/manage', params: { weaponId: item.id } }}
              asChild
            >
              <Pressable style={styles.editButton}>
                <ThemedText style={styles.editButtonText}>
                  {t('weapons.card.edit')}
                </ThemedText>
              </Pressable>
            </Link>
          </View>
        </ThemedView>
      );
    },
    [t]
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          {t('weapons.title')}
        </ThemedText>
        <ThemedText style={styles.subtitle}>{t('weapons.subtitle')}</ThemedText>
        <Link href="/weapon/manage" asChild>
          <Pressable style={styles.primaryButton}>
            <ThemedText style={styles.primaryButtonText}>
              {t('weapons.actions.add')}
            </ThemedText>
          </Pressable>
        </Link>
      </View>

      <View style={styles.filtersSection}>
        <View style={styles.filterGroup}>
          <Pressable
            onPress={toggleOrganizationsExpanded}
            style={[styles.filterHeader, filterHeaderThemeStyle]}
            accessibilityRole="button"
            accessibilityState={{ expanded: organizationsExpanded }}
          >
            <ThemedText type="subtitle" style={styles.filterTitle}>
              {t('weapons.filters.organizations.title')}
            </ThemedText>
            <ThemedText style={styles.filterToggleText}>
              {organizationsExpanded
                ? t('weapons.filters.toggle.hide')
                : t('weapons.filters.toggle.show')}
            </ThemedText>
          </Pressable>
          {!organizationsExpanded && selectedOrganizationLabel ? (
            <ThemedText style={[styles.filterSummary, filterSummaryThemeStyle]}>
              {t('weapons.filters.selected', { value: selectedOrganizationLabel })}
            </ThemedText>
          ) : null}
          {organizationsExpanded ? (
            <View style={styles.filterBody}>
              <View style={styles.filterRow}>
                {organizationOptions.map((option) => (
                  <FilterChip
                    key={option.id ?? 'all-organizations'}
                    label={option.label}
                    selected={selectedOrganizationId === option.id}
                    onPress={() => handleSelectOrganization(option.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.filterGroup}>
          <Pressable
            onPress={toggleProgramsExpanded}
            style={[styles.filterHeader, filterHeaderThemeStyle]}
            accessibilityRole="button"
            accessibilityState={{ expanded: programsExpanded }}
          >
            <ThemedText type="subtitle" style={styles.filterTitle}>
              {t('weapons.filters.programs.title')}
            </ThemedText>
            <ThemedText style={styles.filterToggleText}>
              {programsExpanded
                ? t('weapons.filters.toggle.hide')
                : t('weapons.filters.toggle.show')}
            </ThemedText>
          </Pressable>
          {!programsExpanded ? (
            selectedProgramSummary ? (
              <ThemedText style={[styles.filterSummary, filterSummaryThemeStyle]}>
                {selectedProgramSummary}
              </ThemedText>
            ) : selectedProgramLabel ? (
              <ThemedText style={[styles.filterSummary, filterSummaryThemeStyle]}>
                {t('weapons.filters.selected', { value: selectedProgramLabel })}
              </ThemedText>
            ) : null
          ) : null}
          {programsExpanded ? (
            <View style={styles.filterBody}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRowScroll}
              >
                {programOptions.map((option) => (
                  <FilterChip
                    key={option.id ?? 'all-programs'}
                    label={option.label}
                    selected={selectedProgramId === option.id}
                    onPress={() => handleSelectProgram(option.id)}
                  />
                ))}
              </ScrollView>
              {selectedProgramSummary ? (
                <ThemedText style={styles.programSummary}>{selectedProgramSummary}</ThemedText>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.filterGroup}>
          <ThemedText type="subtitle" style={styles.filterTitle}>
            {t('weapons.filters.reserve.title')}
          </ThemedText>
          <View style={styles.filterRow}>
            {reserveOptions.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={reserveFilter === option.value}
                onPress={() => handleSelectReserve(option.value)}
              />
            ))}
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator accessibilityLabel={t('common.loading')} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText accessibilityRole="alert">{t('weapons.list.error')}</ThemedText>
          <ThemedText style={styles.errorDetails}>{error.message}</ThemedText>
          <Pressable onPress={handleRefresh} style={styles.retryButton}>
            <ThemedText style={styles.retryText}>{t('common.retry')}</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={weapons}
          keyExtractor={(item) => item.id}
          renderItem={renderWeapon}
          contentContainerStyle={
            weapons.length === 0 ? [styles.center, styles.emptyContainer] : styles.listContent
          }
          ListEmptyComponent={<ThemedText>{t('weapons.list.empty')}</ThemedText>}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="gray"
            />
          }
        />
      )}
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
    alignItems: 'center',
    gap: 8,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  primaryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
  },
  primaryButtonText: {
    fontWeight: '700',
  },
  filtersSection: {
    gap: 16,
  },
  filterGroup: {
    gap: 6,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterHeaderDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterHeaderLight: {
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  filterTitle: {
    fontSize: 18,
  },
  filterToggleText: {
    fontWeight: '600',
    fontSize: 13,
    opacity: 0.75,
  },
  filterBody: {
    marginTop: 8,
    gap: 8,
  },
  filterSummary: {
    marginTop: 6,
    fontSize: 13,
  },
  filterSummaryDark: {
    color: 'rgba(226, 232, 240, 0.85)',
  },
  filterSummaryLight: {
    color: 'rgba(15, 23, 42, 0.75)',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterRowScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  listContent: {
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  cardTitle: {
    flex: 1,
    marginRight: 12,
  },
  typeBadge: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  metaText: {
    opacity: 0.8,
  },
  programsContainer: {
    gap: 6,
  },
  programsTitle: {
    fontWeight: '600',
    opacity: 0.9,
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  programName: {
    flex: 1,
    marginRight: 8,
  },
  reserveBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    overflow: 'hidden',
  },
  programSummary: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.7,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  retryText: {
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
  },
  editButtonText: {
    fontWeight: '600',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderColor: 'rgba(37, 99, 235, 0.5)',
  },
  chipText: {
    fontSize: 14,
    opacity: 0.85,
  },
  chipTextSelected: {
    fontWeight: '600',
    opacity: 1,
  },
  errorDetails: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
});

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <ThemedText style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
