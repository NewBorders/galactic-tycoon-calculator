<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GameData, Planet } from '../../services/gamedata/service.ts'
import { searchPlanetsByName } from '../../services/gamedata/service.ts'
import { usePlayerBases } from '../../services/playerBases.ts'
import Draggable from 'vuedraggable'

import PlanetSearch from './components/PlanetSearch.vue'
import ConfiguredBase from './components/ConfiguredBase.vue'

const props = defineProps<{ gameData: GameData }>()
const {
  state,
  planetHasBase,
  addBase,
  removeBase,
  renameBase,
  persist,
  addBuilding,
  setBuilding,
  removeBuilding,
  reorderBuildings,
  isBaseOpen,
  setBaseOpen,
  getSections,
  setSection,
} = usePlayerBases(props.gameData)

const query = ref('')

const suggestions = computed<Planet[]>(() => {
  const text = query.value.trim()
  if (text.length < 2) return []
  return searchPlanetsByName(props.gameData.planets, text)
})

function selectPlanet(planet: Planet) {
  if (!planetHasBase(planet.id)) addBase(planet.id)
  query.value = ''
  persist()
}

function getPlanetById(id: number) {
  return props.gameData.planets.find((pl) => pl.id === id)
}
</script>

<template>
  <div class="space-y-4 text-slate-100">
    <PlanetSearch
      v-model:query="query"
      :suggestions="suggestions"
      :hasBase="planetHasBase"
      @select="selectPlanet"
    />

    <!-- Bases -->
    <Draggable
      v-model="state.bases"
      item-key="id"
      handle=".dnd-handle"
      class="space-y-3"
      @end="persist"
    >
      <template #item="{ element: base }">
        <ConfiguredBase
          :base="base"
          :planet="getPlanetById(base.planetId)"
          :buildings="props.gameData.buildings"
          :isBaseOpen="(id) => isBaseOpen(id)"
          :getSections="(id) => getSections(id)"
          @toggleBase="
            (open) => {
              setBaseOpen(base.id, open)
              persist()
            }
          "
          @toggleSection="
            ({ which, open }) => {
              setSection(base.id, which, open)
              persist()
            }
          "
          @rename="
            (name) => {
              renameBase(base.id, name)
              persist()
            }
          "
          @remove="
            () => {
              removeBase(base.id)
              persist()
            }
          "
          @addBuilding="
            ({ buildingId, level }) => {
              addBuilding(base.id, buildingId, level)
              persist()
            }
          "
          @updateBuilding="
            ({ id, patch }) => {
              setBuilding(base.id, id, patch)
              persist()
            }
          "
          @removeBuilding="
            ({ id }) => {
              removeBuilding(base.id, id)
              persist()
            }
          "
          @reorderBuildings="
            ({ ids }) => {
              reorderBuildings(base.id, ids)
              persist()
            }
          "
          @persist="persist"
        />
      </template>
    </Draggable>
  </div>
</template>
