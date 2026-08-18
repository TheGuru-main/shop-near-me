# Shop Near Me — API Contract v1.0.0.1p

**Product:** Shop Near Me  
**Owner:** The Guru Innovations  
**Stack target:** FastAPI backend + PWA frontend  
**Host target:** Render (HTTPS)  
**Out of scope:** RECCORD DB (separate product; optional future link only)

This document is the source of truth. Backend models/routes and frontend clients MUST follow it. No demo merchants as production data.

---

## 1. Principles

1. Contract first → models/schema → routes → frontend.
2. Every authenticated action is tied to a user identity (phone E.164 + role).
3. Location hierarchy and GSG are separate systems (see §5–6).
4. Heartbeat applies to all roles except `buyer`.
5. Passwords are stored hashed; password hash is NEVER used in GSP/GSG placement math.
6. Same-name products allowed per merchant (distinct product ids).
7. `perishable: true` marks goods for the Perishables surface.

---

## 2. Roles

| role | Description |
|------|-------------|
| `merchant` | Goods incl. fruits, vegetables, perishables; retail/wholesale |
| `service` | Hotels, artisans, clinics, etc. |
| `driver` | Okada, keke, van, courier |
| `emergency` | Police, ambulance, neighborhood watch, clinics |
| `buyer` | Discover, order, prefs; no heartbeat ranking boost |

---

## 3. Phone rules

- Always E.164: `+` + country dial + national number **without** leading `0`.
- National length and first-digit rules are **per country** (server validates).
- Example Nigeria: `+234` + 10 digits, first digit in `7|8|9`.
- Duplicate phone → reject registration.

---

## 4. Auth

### 4.1 Request OTP

`POST /api/v1/auth/otp/request`

```json
{
  "role": "merchant",
  "name": "string",
  "continent_id": "003",
  "continent_name": "Africa",
  "country": "Nigeria",
  "region": "Rivers",
  "city": "Port Harcourt",
  "community": "Eneka",
  "primary_location": "27, Dabu street, Eneka",
  "lat": 4.8156,
  "lng": 7.0498,
  "phone": "+2348162994110",
  "password": "string min 6",
  "prefs": ["Fruits", "Water"]
}

prefs only for buyer (optional array).
Response 200
{
  "pending_id": "uuid",
  "phone": "+2348162994110",
  "expires_in_sec": 600
}
Server: generate OTP (sandbox or Africa's Talking), store hashed OTP + pending payload, do not create final user yet.

4.2 Verify OTP
POST /api/v1/auth/otp/verify
{
  "pending_id": "uuid",
  "otp": "6 digits"
}
Response 200
{
  "access_token": "jwt",
  "token_type": "bearer",
  "user": { "$ref": "UserPublic" }
}

4.3 Login
POST /api/v1/auth/login
{
  "phone": "+2348162994110",
  "password": "string"
}
Response: same as verify (token + UserPublic).

4.4 Me
GET /api/v1/auth/me
Header: Authorization: Bearer <token>
Response: UserPublic

---

## 5. User model

### UserRecord (server)

| Field | Type | Notes |
|-------|------|--------|
| id | uuid | Primary key |
| role | enum | §2 |
| name | string | Display / org name |
| phone | string | E.164 unique |
| password_hash | string | Auth only; NOT used in placement math |
| continent_id | string | `001`–`007` (= continent column) |
| continent_name | string | |
| country | string | |
| region | string | State |
| city | string | |
| community | string | |
| primary_location | string | e.g. `27, Dabu street, Eneka` |
| lat | float | Primary pin |
| lng | float | Primary pin |
| prefs | string[] | Buyer preference labels |
| ladder | object | Computed location hierarchy snapshot |
| gsg | object | From lat/lng at signup; updated when live |
| live | bool | Operator live pin |
| hb_at | datetime\|null | Last heartbeat; null for buyer |
| version | string | App/contract version for compatibility |
| created_at | datetime | |
| updated_at | datetime | |

### UserPublic (client)

Same as UserRecord **without** `password_hash`.

### Continent IDs (fixed UID = column)

| id | col | code | name |
|----|-----|------|------|
| 001 | 1 | Na | North America |
| 002 | 2 | Sa | South America |
| 003 | 3 | A | Africa |
| 004 | 4 | As | Asia |
| 005 | 5 | Eu | Europe |
| 006 | 6 | An | Antarctica |
| 007 | 7 | Au | Australia |

---

## 6. Location hierarchy (not GSG, not 220×64)

Used for tenant–place structure and deterministic cells.

### Placement symbols (every level)

| Symbol | Meaning |
|--------|---------|
| **L** | **Name length of the entity** being placed (normalized, spaces removed) |
| **S** | **Digit sum of the UID** used at that step |
| **c** | Column index from entity first letter (or street letter at primary) |
| Core | Start row family: `((L + S - 1) % R) + 1` with that level’s **R** (rows) |

**L is never “parent name length” as the entity’s L.**  
**S is always sum-of-UID.** Parent supplies the **UID number** whose digits are summed.

### Levels

| Level | Grid | Entity (defines **L**) | UID that feeds **S** |
|-------|------|----------------------|----------------------|
| Earth | 1×1 | — | Center 0 |
| Continent | 7×1 | — | Fixed **001–007** = **column** (special tier) |
| Country | 26×15 | **Country** name length → **L** | UID = **continent name length** (count) → **S = digit sum of that UID** |
| State | 26×21 | **State/region** name length → **L** | UID = **parent country name length** → **S = digit sum** |
| City | 26×15 | **City** name length → **L** | UID = **parent state name length** → **S = digit sum** |
| Community | 26×10 | **Community** name length → **L** | UID = **parent city name length** → **S = digit sum** |
| Primary | street letter | **c** from street name letter (e.g. **D** in Dabu); **L** from **city** name length | UID from city name length → **S = digit sum** |

Country under continent example:

- **L** = length of **country** name  
- **UID** = continent **name length** count  
- **S** = digit sum of that UID  
- Combined as **L + S** for row placement on 26×15  
- Tenant = continent (`continent_id` / col)

Hierarchy does **not** replace GSG, compass, live tick, or heartbeat.

Edits to country, names, phone, or primary location that affect identity MUST recompute `ladder` (and `gsg` if lat/lng change). Version field supports backward compatibility.

---

## 7. GSG (GPS)

Independent of hierarchy.
cell default 0.001°
gsg_x = floor((lon + 180) / cell)
gsg_y = floor((lat + 90) / cell)
L = gsg_y % 100000
S = gsg_x % 100000
c = (gsg_x + gsg_y) % 26
Note: GSG’s L/S/c are **grid indices from coordinates**, not the hierarchy name-length L / UID-sum S.

Live movement updates lat/lng + gsg while `live=true`.  
Compass from delta lat/lng (N, NE, E, SE, S, SW, W, NW).

---

## 8. Heartbeat

- Roles: all except `buyer`.
- Pulse sets `hb_at = now`; score starts at 100.
- Decay: **10% every 10 minutes** (stepped exponential).
- Live toggle / shop-open rules may pulse (product policy).
- Feed/search may weight heartbeat; buyers never receive HB boost.

### Endpoints

`POST /api/v1/presence/heartbeat` — auth required; pulse current user.

`POST /api/v1/presence/live` — body `{ "live": true|false }`; auth required.

---

## 9. Products / catalogue

### ProductRecord

| Field | Type | Notes |
|-------|------|--------|
| id | uuid | Primary key |
| owner_id | uuid | Merchant (or service with listable items) |
| name | string | Display name; **same name allowed** more than once per owner |
| category | string | Business/category label |
| price | number | Major currency units as decimal |
| currency | string | Default `NGN` unless set |
| quantity | number\|null | Stock; null = not tracked |
| available | bool | |
| perishable | bool | **true** → included in Perishables surface |
| description | string\|null | |
| image_url | string\|null | |
| created_at | datetime | |
| updated_at | datetime | |

### Endpoints

`POST /api/v1/products` — auth; role merchant (or allowed service). Body: name, category, price, quantity?, available?, perishable?, description?

`GET /api/v1/products/me` — auth; list own products.

`PATCH /api/v1/products/{id}` — auth; owner only; partial update (price, qty, available, perishable, …).

`DELETE /api/v1/products/{id}` — auth; owner only.

`GET /api/v1/products/perishables` — public or auth; products with `perishable=true` (ranked later by presence/geo).

---

## 10. Search

### Lexicographic tiers (strong → weak)

1. Exact  
2. Exact normalized  
3. Prefix  
4. Sequential character match  
5. Near / fuzzy  
6. Elastic neighbor (optional layer)

Geographic / entity scores apply **on top** (country, region, city, community, category, heartbeat, freshness).

**Exact product match:** prefer nearer km/proxy first, then expand relationship.

### Endpoints

`GET /api/v1/search/merchants?q=` — search by **business/name**.

`GET /api/v1/search/products?q=` — product name search; optional `perishable=true`, `category=`.

Query params (optional): `lat`, `lng` (device position for this search), `country`, `limit`.

Response: ranked list of public cards (merchant or product + owner public fields + score breakdown optional).

---

## 11. Feed

`GET /api/v1/feed` — auth optional.

- Buyer with `prefs`: prefer matching categories/names.  
- Operators with heartbeat: higher HB can rank earlier among actives.  
- Not “demo list”; empty feed is valid when no data.

---

## 12. Fairly used (open market)

Buyer (or policy-allowed roles) can create a **one-time post**; comments, share, message seller → inbox.

### FairlyUsedPost

| Field | Type |
|-------|------|
| id | uuid |
| author_id | uuid |
| title | string |
| body | string |
| price | number\|null |
| created_at | datetime |

`POST /api/v1/fairly-used`  
`GET /api/v1/fairly-used`  
Messaging to author uses §14 when implemented.

---

## 13. Relationship grid (220×64)

Separate from location hierarchy and from GSG.

Used for affinity / ranking features (name-pair bands, category cells, etc.).  
Indexing and walk parameters are implemented in backend search services; clients do not compute the full grid.

Contract requirement: search/feed services MAY attach `relationship_score` in responses; MUST NOT confuse hierarchy L/S with relationship cells.

---

## 14. Purpose of ranking systems

All placement and ranking machinery exists to bring **humans** and the **objects non-buyers post** into **closest useful proximity** for buying, selling, commercialization, and retailing.

Rankable entities:
- **Users** (by role and presence)
- **Objects** they publish (products, service listings, driver availability, emergency presence, fairly used posts)

Grids are not the product; **people + listings** are.

---

## 15. Relationship grid (220 × 64) and start row

- Grid: **220 columns × 64 rows** (relationship / search support).
- **Start row** (same family as messaging identity row):

```text
start_row = ((L + S - 1) % 64) + 1

---

## 14. Purpose of ranking systems

All placement and ranking machinery exists to bring **humans** and the **objects non-buyers post** into **closest useful proximity** for buying, selling, commercialization, and retailing.

Rankable entities:
- **Users** (by role and presence)
- **Objects** they publish (products, service listings, driver availability, emergency presence, fairly used posts)

Grids are not the product; **people + listings** are.

---

## 15. Relationship grid (220 × 64) and start row

- Grid: **220 columns × 64 rows** (relationship / search support).
- **Start row** (same family as messaging identity row):

```text
start_row = ((L + S - 1) % 64) + 1
L = entity name length (normalized, spaces removed)
S = digit sum of UID
Used to support search and relationship closeness, distinct from location hierarchy ladders and from GSG GPS cells.
Clients do not own the full grid; backend search services use start row + relationship indices.

16. Search and crawler (v1)
Lexicographic strength (high → low)
Exact
Exact normalized
Prefix
Sequential character match
Near / fuzzy
Elastic neighbor (typo-tolerant neighbor cells)
On top of lex
Geo / hierarchy proximity (country → region → city → community → primary)
km from searcher device lat/lng when provided (exact product hits: prefer nearer first, then expand)
Category / business type match
Heartbeat (non-buyers only)
Freshness
Elastic cloud
Neighbor cells around a query identity for typo-tolerant suggestions (server-side). Does not replace exact-first ordering.
Visibility
Every field may search.
Buyers are not storefronts on the commercial front.
Exception: buyers appear as posters only in Fairly used.
Card discrimination
Search/feed responses MUST include enough discriminators for the client to choose the correct UI:
role / business_type / category
Card families: catalogue/shop, listing, availability (e.g. driver), service/hotel, emergency, search object card, dashboard (owner only)
Drivers ≠ merchants ≠ hotels/services ≠ emergency in list and detail templates.

17. Heartbeat (final)
Applies to all roles except buyer.
Pulse: hb_at = now, score starts at 100.
Decay: 3% every 10 minutes.
POST /api/v1/presence/heartbeat
POST /api/v1/presence/live body { "live": true|false }

18. Products (final price and payload)
price: optional number; currency: ISO code when price set (not NGN-only; multi-country).
Listing UI asks for price and cautions that visible price builds trust; omission allowed.
If price is set → must display on every product surface.
If null → show explicit fallback (e.g. “Price on request”).
Public product card MUST carry:
Product fields (name, price/currency or fallback, perishable, availability, media if any)
Seller public details
Primary location
km (when searcher coordinates provided)
Active / live / HB-derived status as applicable to seller role
same name allowed multiple times per seller (distinct product_id).

19. Fairly used
Global field entered via Buy or Sell Fairly Used Products.
Inside: compose post + feed (no extra ceremony).
Post: image and/or video, optional text note, then Post.
Each post actions:
Comment
Share
Message seller → poster’s inbox (poster is receiver)

20. Messaging
In-app only (no external contact form requirement).
Phone E.164 unique; backend rejects any number that already exists.
Each user messaging anchor:
start_row = ((L + S - 1) % 64) + 1
L = that user’s name length
S = digit sum of UID from phone digits
Inbox hard key: user_id (uuid); start_row is routing/audit anchor
Send: message stored on receiver (to_user_id, to_start_row).
Reply: previous sender becomes receiver; new to_start_row from their L+S.
MessageRecord
Field
Type
id
uuid
thread_id
uuid
from_user_id
uuid
to_user_id
uuid
from_start_row
int
to_start_row
int
body
string
fairly_used_post_id
uuid|null
product_id
uuid|null
context_type
string
created_at
datetime
Endpoints
GET /api/v1/messages/inbox
GET /api/v1/messages/threads/{thread_id}
POST /api/v1/messages/threads — start (to_user_id + optional product/post context)
POST /api/v1/messages/threads/{thread_id} — send body

21. Errors (common)
HTTP
Meaning
400
Validation (phone length, missing fields)
401
Missing/invalid token
403
Not owner / not allowed role
404
Not found
409
Phone already registered (clone rejected)
429
Rate limit (OTP)
500
Server error
Error body shape:
{ "detail": "human readable", "code": "PHONE_EXISTS" }

22. Versioning and compatibility
API prefix: /api/v1/
User/object records store version (app/contract).
Breaking changes → /api/v2/ or explicit migration notes.
Detail edits that change country, name, phone, or primary location recompute ladder/gsg as required.

23. Deployment
Target: Render (HTTPS).
Backend: FastAPI implementing this contract.
Frontend: PWA against these endpoints only (no production demo merchant lists).
Dev may use sandbox OTP; production SMS provider (e.g. Africa’s Talking) behind the same OTP verify API.


---

## 25. Dictionary APIs

Purpose: expand and normalize language for search/crawler so commercial intent matches real listings (synonyms, categories, commerce terms). Not demo data—curated vocabulary.

### Endpoints

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/dictionary/synonyms?q=` | Returns canonical term + synonyms for query token(s) |
| GET | `/api/v1/dictionary/categories?business_type=` | Categories for merchant / service / driver / emergency / etc. |
| GET | `/api/v1/dictionary/commerce?q=` | Commerce vocabulary hits |
| GET | `/api/v1/dictionary/language?lang=` | Language pack meta / labels (v1 may be minimal) |

### Synonym response (example shape)

```json
{
  "query": "phone",
  "canonical": "phone",
  "synonyms": ["mobile", "smartphone", "cell phone"]
}

Rules
Search SHOULD expand tokens via synonyms before/within ranking; exact match still ranks strongest.
Dictionary entries are versioned (dictionary_version) for backward compatibility.
Empty synonym set is valid (return canonical only).

26. OSM / Geo APIs
Purpose: OpenStreetMap-backed underlayer for place search, reverse geocode, and cascade assist. Does not replace GSG, hierarchy ladder, or 220×64 start_row.
Endpoints
Method
Path
Notes
GET
/api/v1/geo/search?q=&countrycodes=
Forward geocode (OSM/Nominatim or equivalent)
GET
/api/v1/geo/reverse?lat=&lng=
Reverse geocode
GET
/api/v1/geo/autocomplete?level=&parent=&q=
Assist country → state → city (OSM + server filters)
Rules
Primary location text remains user-entered when they set the business/home pin (e.g. 27, Dabu street, Eneka).
lat/lng may come from device GPS and/or geo resolve.
Server stores attribution/compliance as required by OSM policy.
v1 may proxy upstream OSM; self-hosted tiles later.
Response card (minimal)
{
  "display_name": "string",
  "lat": 0.0,
  "lng": 0.0,
  "country": "string",
  "state": "string",
  "city": "string"
}

27. Deletes and reactions
All deletes are auth required. Server enforces ownership or explicit admin policy. Prefer soft delete (deleted_at) for messages, posts, and catalogue objects so threads and audits stay backward compatible; hard delete only where legally required or for account purge.

27.1 Delete message
DELETE /api/v1/messages/{message_id}
Only sender may delete their own message (v1), or both parties soft-hide for themselves if you add per-user hide later.
Response: 204 or { "id": "...", "deleted": true }.

27.2 Delete fairly used post
DELETE /api/v1/fairly-used/{post_id}
Only author (poster).
Soft delete; comments/reactions on post become inaccessible on public feed.

27.3 Delete product / catalogue object
DELETE /api/v1/products/{id}
Only owner.
Removes from catalogue and search index (soft delete).

27.4 Delete / clear availability status
DELETE /api/v1/presence/availability
or POST /api/v1/presence/availability with { "available": false }
Driver/service availability card off.
Does not delete the user account.
POST /api/v1/presence/live with { "live": false } clears live pin (already in contract).

27.5 Delete location pin (primary)
PATCH /api/v1/users/me with cleared or replaced primary_location / lat / lng
Or DELETE /api/v1/users/me/primary-location → clears pin fields and recomputes gsg/ladder as needed.
Account remains.

27.6 Delete account
DELETE /api/v1/users/me
Requires auth (+ optional password confirm body).
Anonymize or purge user; release phone so it may register again after purge completes.
Cascade: soft-delete or detach products, posts, messages per policy (document in implementation).
Backward compatible: other users’ threads show “Deleted user” placeholder, not hard failure.

27.7 Reactions
Reactions may apply to fairly used posts (and later feed objects).
Method
Path
Notes
POST
/api/v1/reactions
body: { "target_type": "fairly_used_post", "target_id": "uuid", "kind": "like" }
DELETE
/api/v1/reactions/{reaction_id}
Remove own reaction
DELETE
/api/v1/reactions
Optional: body target + kind to idempotent remove own reaction
Only the reactor deletes their reaction.
Target owner deleting the post soft-deletes associated reactions from public view.

28. Backward compatibility
Rule
Detail
API prefix
Stay on /api/v1/ for additive changes
Additive fields
New JSON fields optional; old clients ignore unknown keys
Removed fields
Do not remove in v1 without deprecation window
Soft delete
Default for content; list endpoints exclude deleted_at IS NOT NULL
User version
user.version / dictionary_version for client feature gates
Phone reuse
Only after account delete/purge completes
Rank/placement formula changes
Bump contract version; keep old clients working via stored snapshots on user/object where needed
Placeholders
Deleted sender/post shows stable placeholder strings, not 500s
Breaking changes → /api/v2/ or coordinated app release.
API Contract v1.0.0.1p 
