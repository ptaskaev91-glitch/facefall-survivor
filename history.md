# Facefall Survivor — History

Последняя актуализация: **2026-08-10**  
Репозиторий: `ptaskaev91-glitch/facefall-survivor`  
Основная ветка: `main`

---

# 1. Назначение файла

`history.md` хранит историю обсуждения и развития Facefall Survivor так, чтобы новый чат мог восстановить:

- первоначальную идею;
- требования пользователя;
- принятые решения;
- ошибки и неудачные подходы;
- причины архитектурных изменений;
- результаты аудитов;
- текущую точку разработки;
- договорённости о дальнейшей работе.

Это **проектный журнал переписки**, а не dump внутренних tool-calls или скрытых рассуждений. Сохраняются запросы пользователя, существенные ответы/выводы, решения и фактические действия.

Правило на будущее: после крупного этапа или перед переносом работы в новый чат сюда добавляется новая датированная секция.

---

# 2. Исходная идея

## 2026-08-10 — постановка задачи

Пользователь предложил сделать браузерную игру про выживание против зомби/заражённых.

Ключевая идея:

- игровой процесс в духе top-down action / Diablo;
- герой стреляет из огнестрельного оружия и лука;
- пользователь при входе загружает фотографию;
- лицо с фотографии используется как лицо игрового героя;
- игра должна выглядеть не как демонстрация canvas, а как атмосферная полноценная игра;
- обязательна возможность играть на телефоне.

Базовые типы оружия были зафиксированы как:

- pistol;
- shotgun;
- bow.

Базовые типы заражённых позднее закрепились как:

- Walker;
- Runner;
- Brute.

---

# 3. Первые браузерные версии

Изначально проект создавался как максимально простой browser MVP на HTML/CSS/JavaScript.

Первые задачи:

- загрузка фотографии;
- canvas/web game loop;
- стрельба;
- волны заражённых;
- mobile controls;
- публикация в публичном GitHub repository.

Создан публичный репозиторий:

`ptaskaev91-glitch/facefall-survivor`

В качестве source-of-truth была выбрана ветка `main`.

---

# 4. GitHub Pages → Vercel

На раннем этапе была попытка использовать GitHub Pages.

Фактический результат:

- GitHub Pages возвращал 404;
- отдельный Pages workflow добавлял лишнюю инфраструктуру;
- Vercel deployment работал заметно надёжнее.

Пользователь принял решение:

> «Окей, если можно без pages и только с Vercel — давай делать так.»

После этого было закреплено правило:

- GitHub = source repository;
- Vercel = единственный production hosting target;
- GitHub Pages не используется;
- Pages workflow был удалён.

Основной production URL:

`https://facefall-survivor-pavels-projects-0b29bb12.vercel.app`

Это решение остаётся актуальным.

---

# 5. Build 0.3 Cinematic

После первых рабочих прототипов пользователь попросил:

> продолжать разработку, добавить красоты и эффектов, добиться впечатляющего внешнего вида.

Версия 0.3 получила крупный visual/combat pass.

Было добавлено:

- cinematic landing screen;
- local face upload через `localStorage`;
- top-down Canvas/renderer survival loop;
- pistol / shotgun / bow;
- ammo / reload / recoil;
- rain;
- fog;
- lightning;
- synthetic thunder;
- night lighting;
- player light;
- street lights / fire light;
- muzzle flash;
- smoke;
- shell casings;
- tracers / arrows;
- camera shake;
- wet road;
- puddles / mud;
- abandoned props;
- Walker / Runner / Brute;
- blood particles;
- blood decals;
- corpse decals;
- floating damage numbers;
- medkit/ammo pickups;
- mobile auto-aim;
- procedural audio.

Важный технический урок этого этапа: сложные эффекты начали слишком быстро накапливаться внутри monolithic runtime.

---

# 6. Runtime bugs 0.3

Во время 0.3 были найдены и исправлены как минимум две важные ошибки.

## Rain/Fog initialization

Массивы `rain` / `fog` были объявлены после вызова `resize()`, что могло приводить к `ReferenceError` из-за temporal dead zone.

Исправление: initialization перенесён до первого `resize()`.

## Lighting mask

Темнота первоначально рисовалась на основном canvas, после чего `destination-out` мог стирать уже отрисованный мир.

Исправление: создан отдельный offscreen light mask, который затем composited поверх сцены.

Также был сделан локальный mocked runtime test, запускавший старт игры и несколько кадров — он помог поймать проблему до публикации.

---

# 7. Переход в 3D и dual-camera

Пользователь попросил:

> «Продолжай, делай прям качественно. И сделай вариант вида от 3го лица. Добавь траву и другие текстуры».

После этого направление проекта изменилось от 2D/canvas-style прототипа к Three.js/WebGL 3D.

Были добавлены:

- top-down 3D camera;
- third-person camera;
- переключение camera;
- 3D terrain;
- procedural grass;
- dirt / asphalt textures;
- trees;
- props;
- rain/fog/light;
- mobile controls.

Пользователь попросил слить изменения в `main` и проверить их самостоятельно.

---

# 8. Критические проблемы mobile runtime

После слияния пользователь сообщил:

> «Ни одна кнопка не нажимается».

Далее после исправлений появилась другая проблема: экран бесконечно показывал состояние включения/загрузки, но игра не запускалась.

Были проведены несколько stabilization passes:

- меню отделено от 3D initialization;
- добавлены timeout/fallback механизмы;
- создан `styles-safe.css`;
- Three.js и GLTFLoader временно проксировались через Vercel same-origin routes;
- production entrypoint переключался на наиболее устойчивые runtime версии.

Главный урок: runtime dependency от внешнего CDN и большой единый JS-файл являются риском для Android/browser startup.

Этот опыт позже стал одной из причин перехода на npm + Vite + TypeScript bundle.

---

# 9. Визуальный аудит текущего 3D прототипа

Пользователь прислал скриншот third-person режима и спросил:

> «Что тебя смущает?»

В результате был зафиксирован важный поворот в разработке.

Основные проблемы текущего прототипа:

- герой выглядел как примитивный mannequin;
- лицо не воспринималось как настоящее лицо персонажа;
- сцена была слишком тёмной;
- трава/материалы недостаточно читались;
- third-person camera была слишком близко/низко;
- оружие почти не читалось в силуэте;
- заражённые были визуально похожи на procedural humanoids;
- карта была слишком пустой;
- HUD выглядел как web UI;
- дальнейшее усложнение BoxGeometry/SphereGeometry не давало нужного visual jump.

Было принято решение перестать полировать примитивы и перейти к полноценным GLB characters, weapons и authored environment.

---

# 10. Первый `dev.md`

Пользователь попросил:

> «Составь план в файле dev.md».

Был создан первый roadmap с этапами:

- Character Quality Pass;
- Infected Quality Pass;
- Abandoned Outskirts;
- Terrain & Materials;
- Lighting & Atmosphere;
- Third-Person Camera 2.0;
- Top-Down Camera 2.0;
- Combat Feel;
- Face System 2.0;
- HUD/UX;
- gameplay depth;
- audio;
- performance profiles;
- production discipline.

Первоначально 0.5 планировался как визуальный vertical slice.

---

# 11. Build 0.5 ALPHA — Character Pass

После команды пользователя:

> «Делай»

был сделан первый переход от procedural mannequin к humanoid GLB pipeline.

Ключевые изменения:

- загрузка humanoid GLB hero;
- Three.js `AnimationMixer`;
- idle / walk / run prototype;
- weapon visual groups;
- face mask, привязанная к голове;
- переработанная third-person camera;
- дополнительный свет на персонаже;
- fallback mannequin при проблемах GLB.

Для прототипирования использовалась тестовая humanoid model Soldier из Three.js examples. Она была нужна только как pipeline proof, а не как финальный asset Facefall.

Production entrypoint был переключён на build 0.5 ALPHA.

---

# 12. Решение провести архитектурные аудиты

После первых попыток улучшать Three.js prototype стало понятно, что дальнейшее развитие без архитектурной базы приведёт к очередному monolith.

Пользователь предложил последовательно изучить другие игровые open-source проекты.

Была поставлена задача не просто описать репозитории, а ответить:

- что в них реализовано хорошо;
- что полезно Facefall;
- что нельзя переносить;
- какие решения должны изменить наш `dev.md` и архитектуру.

---

# 13. Аудит №1 — `ivanoskov/shooter`

Репозиторий:

`https://github.com/ivanoskov/shooter`

Главный вывод: это не полноценный готовый shooter, а хороший небольшой Three.js FPS/framework prototype.

Особенно полезны:

- TypeScript;
- Vite;
- npm Three.js;
- GLB level loading;
- static Octree;
- Capsule player collider;
- quality presets;
- debug GUI;
- разделение Player / Camera / Input / Game.

Неудачные/неподходящие решения:

- double physics update;
- renderer создавался более одного раза;
- сомнительная mouse sensitivity math;
- desktop-first Pointer Lock;
- dynamic Octree не подходит как основа crowd simulation;
- combat и enemy AI практически отсутствуют.

Главный вывод для Facefall:

> **Использовать его как ориентир browser foundation, но не как game codebase.**

После аудита возникла идея обязательного промежуточного этапа `0.5A — Engine Foundation`.

---

# 14. Аудит №2 — `Unvanquished/Unvanquished`

Репозиторий:

`https://github.com/Unvanquished/Unvanquished`

Главное уточнение: сам repository содержит game-logic layer, а низкоуровневый engine находится в отдельном Dæmon Engine.

Полезные идеи:

- simulation отдельно от presentation;
- серверно/клиентское разделение ответственности как архитектурный пример;
- data-driven weapons;
- data-driven character/enemy attributes;
- полноценный projectile system;
- DamageEvent / Health / death pipeline;
- CombatFeedback отдельно от damage simulation;
- component-oriented entities;
- Behavior Tree / decision architecture;
- Recast/Detour navmesh;
- animation states и blending.

Для Facefall было решено:

- не копировать native engine;
- не копировать networking/prediction;
- не копировать тяжёлый CBSE generator;
- взять философию component-oriented systems;
- использовать navmesh для заражённых;
- оставить collision и navigation разными системами;
- сделать lightweight State Tree вместо полного тяжёлого Behavior Tree framework.

Лицензионный вывод:

- Unvanquished game logic GPL;
- архитектурные идеи изучаем;
- GPL game code напрямую в Facefall не переносим.

Главный вывод:

> **Shooter показывает browser foundation; Unvanquished показывает, как строить gameplay layer.**

---

# 15. Аудит №3 — `redeclipse/base`

Репозиторий:

`https://github.com/redeclipse/base`

Этот аудит должен был стать последним перед продолжением игры.

Самые полезные части Red Eclipse:

## Weapon feel

- weapon state machine;
- primary/secondary/reload/switch states;
- recoil pitch/yaw/recovery;
- spread зависит от состояния игрока;
- head/torso/limb hit zones;
- hitscan и projectile — разные модели выстрела.

## FX

Один gameplay event может запускать композицию:

- particles;
- light;
- sound;
- wind;
- decal/stain;
- camera feedback.

## Environment

- grass distance culling;
- grass taper;
- budgets;
- global wind;
- local wind impulses;
- bounded stains/decals с fade и TTL.

## Level entities

Уровень состоит не только из geometry, но и из meaningful markers: light, sound, wind, actor, trigger и т.д.

Это подтвердило нашу целевую схему:

```text
level.glb = geometry / visuals / collision source
level.manifest.json = gameplay/environment markers
navmesh = AI traversal
```

AI Red Eclipse основан на waypoint system; для Facefall он признан менее подходящим, чем navmesh architecture из Unvanquished.

Лицензии:

- source Red Eclipse — zlib;
- media/assets — отдельные лицензии;
- ассеты нельзя автоматически переносить только потому, что source открыт.

Главный итог трёх аудитов:

> **Facefall = browser foundation из идей shooter + gameplay architecture из идей Unvanquished + combat/FX/environment philosophy Red Eclipse + собственный mobile-first слой.**

---

# 16. Начало `0.5A — Engine Foundation`

После третьего аудита был начат параллельный `engine-next`.

Важно: production legacy 0.5 специально не был удалён и не был заменён незавершённым runtime.

Были добавлены:

- `package.json`;
- Three.js как npm dependency;
- TypeScript strict;
- Vite;
- `engine-lab.html`;
- fixed `GameLoop`;
- typed `EventBus`;
- static Octree + Capsule `CollisionWorld`;
- unified `InputManager`;
- keyboard/mouse adapter;
- touch adapter;
- data-driven pistol / shotgun / bow;
- WeaponSystem;
- Health;
- DamageSystem;
- ballistic ProjectileSystem для bow;
- CombatFeedback boundary;
- Walker / Runner / Brute archetypes;
- mobile/desktop quality profiles;
- effect recipes;
- bounded ParticlePool;
- bounded DecalPool;
- WindField;
- DualCameraRig;
- clustered/distance-culled GrassField;
- GitHub Actions typecheck/build workflow.

На этом этапе был намеренно остановлен дальнейший coding, чтобы сначала сформировать документацию и зафиксировать архитектуру.

---

# 17. Текущая команда пользователя — documentation freeze

Пользователь сформулировал новое правило работы:

> создать `structure.md`, где отражается текущая и целевая файловая структура;
>
> создать `history.md`, где хранится история переписки и решений;
>
> актуализировать `dev.md`, где фиксируются выполненные и будущие шаги;
>
> свести все три аудита в единое понимание технологии, инструментов и архитектуры;
>
> **саму разработку пока не продолжать — только подготовить документацию.**

Это текущая активная задача.

---

# 18. Зафиксированные принципиальные решения

На текущую дату считаются принятыми:

1. Vercel — единственный production hosting target.
2. GitHub `main` — source-of-truth.
3. GitHub Pages не нужен.
4. Legacy 0.5 остаётся рабочей контрольной точкой до parity engine-next.
5. Новая архитектура — TypeScript + Vite + npm Three.js.
6. Runtime CDN для Three.js в целевой версии не используется.
7. Один fixed timestep loop.
8. Static level collision — Octree.
9. Player collision — Capsule.
10. AI navigation — navmesh, а не static Octree и не waypoint graph.
11. Crowd neighbour search — spatial hash/grid.
12. Weapons / enemy archetypes — data-driven.
13. Simulation и presentation разделены.
14. FX создаются через recipes/pools/budgets.
15. Pistol/shotgun — hitscan; bow — ballistic projectile.
16. Две камеры используют одну simulation, а не две разные версии игры.
17. UI остаётся лёгким DOM/CSS; React на текущем этапе не нужен.
18. Face processing остаётся local-first.
19. Final art — GLB/GLTF, а primitives только lab/fallback.
20. Android test обязателен перед каждым крупным production milestone.
21. Content licenses проверяются отдельно для каждого внешнего asset.
22. `dev.md`, `structure.md`, `history.md` обновляются на контрольных точках.

---

# 19. Ключевые GitHub checkpoints

Некоторые важные commits текущей истории:

- `bdaac4f9` — первый development roadmap;
- `1b87f91e` — proxy GLTF/hero pipeline для 0.5 prototype;
- `6e91a001` — animated GLB hero и upgraded cameras;
- `13992ed6` — production entrypoint на 0.5 Character Pass;
- `1dcd508e` — Vite/TypeScript engine foundation;
- `ef6a5885` — strict TypeScript;
- `05878945` — isolated Vite build;
- `b2e71048` — `engine-lab.html`;
- `42d25e4e` — typed EventBus;
- `d9b05d40` — fixed GameLoop;
- `36528b87` — Octree/Capsule collision;
- `7a86692d` — data-driven weapons;
- `52526827` — infected archetypes;
- `714a69cf` — quality profiles;
- `499b621c` — DualCameraRig;
- `c9be4b8a` — clustered GrassField;
- `a883fea1` — engine-next CI;
- `437739f3` — InputManager;
- `592169dc` — TouchInput;
- `e8022824` — WeaponSystem;
- `1ca80229` — Damage pipeline;
- `ffec0da8` — ballistic projectile foundation;
- `f9c79c0e` — bounded particle pool;
- `b1ef5df0` — bounded/fading decal pool;
- `ba385b27` — WindField;
- `28427a05` — separation of combat simulation/presentation;
- `a701fce2` — dev progress after Red Eclipse audit.

---

# 20. Как продолжать этот файл

Для каждого следующего крупного блока добавлять:

```text
## YYYY-MM-DD — название этапа

### Запрос пользователя
Что нужно было получить.

### Решение
Какая архитектура/подход выбраны.

### Что сделано
Ключевые изменения и commits.

### Что не сработало
Ошибки, откаты, ограничения.

### Итог
Контрольная точка и следующий шаг.
```

Не переписывать прошлые решения задним числом. Если решение изменилось — добавить новое событие и объяснить причину изменения.
