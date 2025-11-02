# 📚 Animek Manga API Documentation

> Dokumentasi API Manga dari KomikIndo – bagian dari proyek **Animek Manga Backend**.  
> Dibuat oleh **Noptzy**.

---

## 📁 Base URL

http://localhost:3500/api/v1/manga/komik-indo

---

## ⚙️ Routes Overview

| Method | Endpoint                 | Deskripsi                                                      |
| :----: | :----------------------- | :------------------------------------------------------------- |
| `GET`  | `/chapter/:chapterPath`  | Mendapatkan gambar dari suatu chapter manga                    |
| `GET`  | `/mangas`                | Mendapatkan daftar manga berdasarkan halaman                   |
| `GET`  | `/mangas/:slug`          | Mendapatkan detail manga berdasarkan slug                      |
| `GET`  | `/mangas/search?s=query` | Mencari manga berdasarkan kata kunci                           |
| `GET`  | `/mangas/filter`         | Mendapatkan daftar manga berdasarkan filter (genre, tema, dll) |

---

## 📘 1. Get Chapter Images

### Endpoint

GET /chapter/:chapterPath

### Parameter Path

| Nama          | Wajib | Tipe   | Deskripsi                    |
| :------------ | :---- | :----- | :--------------------------- |
| `chapterPath` | ✅    | string | Path unik dari chapter manga |

### Contoh Request

GET http://localhost:3500/api/v1/manga/komik-indo/chapter/chainsaw-man-chapter-1

### Contoh Response

```json
{
    "success": true,
    "message": "Success Get Chapter Images",
    "creator": "Nostzy",
    "data": {
        "title": "Chainsaw Man Chapter 1",
        "images": ["https://.../emmugEnp4R26HXH001.jpg", "https://.../XZsAGaoWpesl3Ec002.jpg"],
        "next_chapter_url": "/chainsaw-man-chapter-2/"
    }
}
```

Penjelasan

> images berisi daftar URL gambar dari halaman manga
> next_chapter_url mengarah ke chapter berikutnya.

## 2. Get All Mangas

### Endpoint

GET /mangas?page={number}

### Query Parameter

| Nama   | Wajib | Default | Deskripsi                              |
| :----- | :---- | :------ | :------------------------------------- |
| `page` | ❌    | 1       | Nomor halaman manga yang ingin diambil |

### Contoh Parameter

GET http://localhost:3500/api/v1/manga/komik-indo/mangas?page=125

### Contoh Response

```json
{
    "success": true,
    "message": "Success Get Mangas at page 125",
    "creator": "Noptzy",
    "data": {
        "mangaList": [
            {
                "title": "Buyuden",
                "slug": "buyuden",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Buyuden-203x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 59",
                    "url": "/manga/komik-indo/chapter/buyuden-chapter-59/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Futari no Jikan",
                "slug": "futari-no-jikan",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Futari-no-Jikan-224x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 04",
                    "url": "/manga/komik-indo/chapter/futari-no-jikan-chapter-04/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Shoujo, Akuma to naru ni ha",
                "slug": "shoujo-akuma-to-naru-ni-ha",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-How-To-Become-A-Demon-Girl-224x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 05",
                    "url": "/manga/komik-indo/chapter/shoujo-akuma-to-naru-ni-ha-chapter-05/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Kami-sama no iru Keshiki",
                "slug": "kami-sama-no-iru-keshiki",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Kami-sama-no-iru-Keshiki-225x319.png",
                "latest_chapter": {
                    "title": "Ch. 04",
                    "url": "/manga/komik-indo/chapter/kami-sama-no-iru-keshiki-chapter-04/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Aoi Kiseki",
                "slug": "aoi-kiseki",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Aoi-Kiseki-202x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 5",
                    "url": "/manga/komik-indo/chapter/aoi-kiseki-chapter-5/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Ansatsu Kyoushitsu",
                "slug": "ansatsu-kyoushitsu",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Assassination-Classroom-203x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 180.8",
                    "url": "/manga/komik-indo/chapter/ansatsu-kyoushitsu-chapter-180-8/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Ao Haru Ride",
                "slug": "739873-ao-haru-ride",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Ao-Haru-Ride-203x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 49.5",
                    "url": "/manga/komik-indo/chapter/ao-haru-ride-chapter-49-5/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Another",
                "slug": "another",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Another-225x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 20",
                    "url": "/manga/komik-indo/chapter/another-chapter-20/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Anorexia – Shikabane Hanako wa Kyoshokushou",
                "slug": "anorexia-shikabane-hanako-wa-kyoshokushou",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Anorexia-Shikabane-Hanako-wa-Kyoshokushou-219x319.png",
                "latest_chapter": {
                    "title": "Ch. 09",
                    "url": "/manga/komik-indo/chapter/anorexia-shikabane-hanako-wa-kyoshokushou-chapter-09/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Ane Doki!",
                "slug": "ane-doki",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Anedoki-202x319.png",
                "latest_chapter": {
                    "title": "Ch. 26",
                    "url": "/manga/komik-indo/chapter/ane-doki-chapter-26/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Amalgam of Distortion",
                "slug": "amalgam-of-distortion",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Ibitsu-no-Amalgam-203x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 18 End",
                    "url": "/manga/komik-indo/chapter/amalgam-of-distortion-chapter-18-end/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "All You Need Is Kill",
                "slug": "288937-all-you-need-is-kill",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-All-You-Need-Is-Kill-203x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 17",
                    "url": "/manga/komik-indo/chapter/all-you-need-is-kill-chapter-17/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Akuma To Candy",
                "slug": "akuma-to-candy",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Medete-Junjou-203x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 3",
                    "url": "/manga/komik-indo/chapter/akuma-to-candy-chapter-3/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Aku no Hana",
                "slug": "aku-no-hana",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Aku-no-Hana-213x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 57",
                    "url": "/manga/komik-indo/chapter/aku-no-hana-chapter-57/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Akame ga KILL!",
                "slug": "akame-ga-kill",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Akame-ga-KILL-224x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 78.5",
                    "url": "/manga/komik-indo/chapter/akame-ga-kill-chapter-78-5/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Aizawa-san Zoushoku",
                "slug": "aizawa-san-zoushoku",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Aizawa-san-Zoushoku-224x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 38",
                    "url": "/manga/komik-indo/chapter/aizawa-san-zoushoku-chapter-38/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Ai Kora",
                "slug": "ai-kora",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Ai-Kora-212x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 119",
                    "url": "/manga/komik-indo/chapter/ai-kora-chapter-119/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Aimane - Akuma na Kanojo o Produce",
                "slug": "aimane-akuma-na-kanojo-o-produce",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Aimane-Akuma-na-Kanojo-o-Produce-225x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 13",
                    "url": "/manga/komik-indo/chapter/aimane-akuma-na-kanojo-o-produce-chapter-13/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Act-Age",
                "slug": "act-age",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Act-Age-203x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 121",
                    "url": "/manga/komik-indo/chapter/act-age-chapter-121/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "Ai kara Hajimaru",
                "slug": "ai-kara-hajimaru",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Ai-kara-Hajimaru-191x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 3",
                    "url": "/manga/komik-indo/chapter/ai-kara-hajimaru-chapter-3/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "666 Satan",
                "slug": "666-satan",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-666-Satan-203x319.png",
                "latest_chapter": {
                    "title": "Ch. 76",
                    "url": "/manga/komik-indo/chapter/666-satan-chapter-76/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "20th Century Boys",
                "slug": "20th-century-boys",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/11/Komik-20th-Century-Boys-223x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 130",
                    "url": "/manga/komik-indo/chapter/20th-century-boys-chapter-130/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "16 Life",
                "slug": "16-life",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/11/Komik-16-Life-202x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 11",
                    "url": "/manga/komik-indo/chapter/16-life-chapter-11/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "100% Gokuama Kareshi!",
                "slug": "100-gokuama-kareshi",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/11/Komik-100-Gokuama-Kareshi-208x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 06",
                    "url": "/manga/komik-indo/chapter/100-gokuama-kareshi-chapter-06/",
                    "updated_ago": "5 tahun lalu"
                }
            },
            {
                "title": "07-Ghost",
                "slug": "136271-07-ghost",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/11/Komik-07-Ghost-224x319.jpg",
                "latest_chapter": {
                    "title": "Ch. 40",
                    "url": "/manga/komik-indo/chapter/07-ghost-chapter-40/",
                    "updated_ago": "5 tahun lalu"
                }
            }
        ],
        "page": 125,
        "totalPage": 125,
        "next_page_num": null,
        "hasNext": false,
        "totalMangas": 25
    }
}
```

## 3. GET Manga Detail

### Endpoint

GET /mangas/:slug

### Parameter Path

| Nama   | Wajib | Tipe   | Deskripsi              |
| :----- | :---- | :----- | :--------------------- |
| `slug` | ✅    | string | Nama unik (slug) manga |

### Contoh Request

GET http://localhost:3500/api/v1/manga/komik-indo/mangas/akame-ga-kill

### Contoh Response

```json
{
    "success": true,
    "message": "Success get Manga",
    "creator": "Nostzy",
    "data": {
        "title": "“Issho ni Netaindesu yo Ne, Senpai?” to Amaku Sasayakarete Kon’ya mo Nemurenai",
        "slug": "issho-ni-netaindesu-yo-ne-senpai-to-amaku-sasayakarete-konya-mo-nemurenai",
        "poster_url": "https://komikindo.ch/wp-content/uploads/2025/05/Komik-Issho-ni-Netaindesu-yo-Ne-Senpai-to-Amaku-Sasayakarete-Konya-mo-Nemurenai-224x319.jpg",
        "status": "Ongoing",
        "author": "Imori Kiren",
        "illustrator": "Mintarou",
        "alt_title": "「一緒に寝たいんですよね、せんぱい？」と甘くささやかれて今夜も眠れない, \"You Want to Sleep With Me, Don't You, Senpai?\" and She Whispered Sweetly, So I Can't Sleep Tonight Either, Trị Chứng Mất Ngủ Bằng Asmr Cùng Nhỏ Đàn Em Tinh Nghịch~",
        "genres": ["Comedy", "Drama", "Romance", "Slice of Life"],
        "synopsis": "Manga “Issho ni Netaindesu yo Ne, Senpai?” to Amaku Sasayakarete Kon’ya mo Nemurenai yang dibuat oleh komikus bernama Imori Kiren ini bercerita tentang Bakuya, seorang siswi SMA kelas dua yang menderita insomnia, namun, suatu malam, ia bertemu Kimidori, seorang siswi kelas satu yang gemar makan mi instan yakisoba. Kimidori mengaku ia dapat membantu Bakuya tidur; namun, ia senang mengerjainya setiap kali ada kesempatan.",
        "total_chapters": 4,
        "chapters": [
            {
                "chapter_number": "1",
                "title": "Komik “Issho ni Netaindesu yo Ne, Senpai?” to Amaku Sasayakarete Kon’ya mo Nemurenai Chapter 1",
                "url": "/manga/komik-indo/chapter/issho-ni-netaindesu-yo-ne-senpai-to-amaku-sasayakarete-konya-mo-nemurenai-chapter-1/",
                "release_ago": "5 bulan yang lalu"
            },
            {
                "chapter_number": "2",
                "title": "Komik “Issho ni Netaindesu yo Ne, Senpai?” to Amaku Sasayakarete Kon’ya mo Nemurenai Chapter 2",
                "url": "/manga/komik-indo/chapter/issho-ni-netaindesu-yo-ne-senpai-to-amaku-sasayakarete-konya-mo-nemurenai-chapter-2/",
                "release_ago": "4 bulan yang lalu"
            },
            {
                "chapter_number": "3",
                "title": "Komik “Issho ni Netaindesu yo Ne, Senpai?” to Amaku Sasayakarete Kon’ya mo Nemurenai Chapter 3",
                "url": "/manga/komik-indo/chapter/issho-ni-netaindesu-yo-ne-senpai-to-amaku-sasayakarete-konya-mo-nemurenai-chapter-3/",
                "release_ago": "3 bulan yang lalu"
            },
            {
                "chapter_number": "4",
                "title": "Komik “Issho ni Netaindesu yo Ne, Senpai?” to Amaku Sasayakarete Kon’ya mo Nemurenai Chapter 4",
                "url": "/manga/komik-indo/chapter/issho-ni-netaindesu-yo-ne-senpai-to-amaku-sasayakarete-konya-mo-nemurenai-chapter-4/",
                "release_ago": "3 bulan yang lalu"
            }
        ]
    }
}
```

## 4. Search Manga

### Endpoint

GET /mangas/search?s=query

### Parameter Path

| Nama | Wajib | Tipe   | Deskripsi                  |
| :--- | :---- | :----- | :------------------------- |
| `s`  | ✅    | string | Kata Kunci pencarian Manga |

### Contoh Request

GET http://localhost:3500/api/v1/manga/komik-indo/mangas/search?s=onepiece

### Contoh Response

```json
{
    "success": true,
    "message": "Success Search Manga",
    "creator": "Nostzy",
    "data": [
        {
            "title": "One Piece: Log Book Omake",
            "slug": "one-piece-log-book-omake",
            "poster_url": "https://komikindo.ch/wp-content/uploads/2021/04/Komik-One-Piece-Log-Book-Omake-214x319.jpg",
            "rating": "8.3"
        },
        {
            "title": "One Piece: Ace Story",
            "slug": "one-piece-ace-story",
            "poster_url": "https://komikindo.ch/wp-content/uploads/2021/02/Manga-One-Piece-Ace-Story-213x319.jpg",
            "rating": "7"
        },
        {
            "title": "One Piece",
            "slug": "one-piece-id",
            "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-One-Piece-203x319.jpg",
            "rating": "9.33"
        },
        {
            "title": "Wanted!",
            "slug": "wanted",
            "poster_url": "https://komikindo.ch/wp-content/uploads/2023/07/Komik-Wanted-209x319.png",
            "rating": "7.54"
        },
        {
            "title": "Shokugeki no Sanji",
            "slug": "shokugeki-no-sanji",
            "poster_url": "https://komikindo.ch/wp-content/uploads/2021/01/Komik-Shokugeki-no-Sanji-215x319.jpg",
            "rating": "8.04"
        }
    ]
}
```

## 5. Search Manga with Filter

### Endpoint

GET GET /mangas/filter

### Parameter Path

| Nama          | Deskripsi                                       |
| :------------ | :---------------------------------------------- |
| `page`        | Kata Kunci pencarian Manga                      |
| `genre`       | Filter berdasarkan genre (bisa lebih dari satu) |
| `demografi`   | Filter berdasarkan demografia                   |
| `konten`      | Filter berdasarkan jenis konten                 |
| `tema`        | Filter berdasarkan tema manga                   |
| `status`      | Filter berdasarkan status manganya              |
| `Jenis Komik` | Filter berdasarkan jenis manga                  |
| `Format`      | Filter berdasarkan format manga                 |

### Daftar filter

| Nama          | Deskripsi                                                                                                                                                                                                                                                                                                                                                                                                                              |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `genre`       | Action, Adventure, Boys' Love, Comedy, Crime, Drama, Fantasy, Girls' Love, Harem, Historical, Horror, Isekai, Josei, Magical Girls, Martial Arts, Mecha, Medical, Music, Mystery, Philosophical, Psychological, Romance, School Life, Sci-Fi, Seinen, Shoujo Ai, Shounen, Shounen Ai, Slice of Life, Sports, Superhero, Supernatural, Thriller, Tragedy, Wuxia, Yuri                                                                   |
| `demografi`   | Josei, Seinen, Shoujo, Shounen                                                                                                                                                                                                                                                                                                                                                                                                         |
| `konten`      | Ecchi, Gore, Sexual Violence, Smut                                                                                                                                                                                                                                                                                                                                                                                                     |
| `tema`        | Aliens, Animals, Cooking, Crossdressing, Delinquents, Demons, Ecchi, Genderswap, Ghosts, Gore, Gyaru, Harem, Incest, Loli, Mafia, Magic, Martial Arts, Military, Monster Girls, Monsters, Music, Ninja, Office Workers, Police, Post-Apocalyptic, Reincarnation, Reverse Harem, Samurai, School Life, Shota, Smut, Supernatural, Survival, Time Travel, Traditional Games, Vampires, Video Games, Villainess, Virtual Reality, Zombies |
| `status`      | All, Ongoing, Completed                                                                                                                                                                                                                                                                                                                                                                                                                |
| `Jenis Komik` | All, Manga, Manhwa, Manhua                                                                                                                                                                                                                                                                                                                                                                                                             |
| `Format`      | All, Hitam Putih, Berwarna                                                                                                                                                                                                                                                                                                                                                                                                             |

### Contoh Request

GET http://localhost:3500/api/v1/manga/komik-indo/mangas/filter?status=Completed&format=bw&genre=comedy&type=Manga&order=title&title=

### Contoh Response

```json
{
    "success": true,
    "message": "Success Get Filtered Manga",
    "creator": "Noptzy",
    "data": {
        "mangaList": [
            {
                "title": "07-Ghost",
                "slug": "136271-07-ghost",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/11/Komik-07-Ghost-224x319.jpg",
                "url": "/komik-indo/manga/136271-07-ghost/",
                "rating": "8.2"
            },
            {
                "title": "100-nin no Eiyuu o Sodateta Saikyou Yogensha wa, Boukensha ni Natte mo Sekaijuu no Deshi kara Shitawarete Masu",
                "slug": "100-nin-no-eiyuu-o-sodateta-saikyou-yogensha-wa-boukensha-ni-natte-mo-sekaijuu-no-deshi-kara-shitawarete-masu",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2021/01/Komik-100-nin-no-Eiyuu-o-Sodateta-Saikyou-Yogensha-wa-Boukensha-ni-Natte-mo-Sekaijuu-no-Deshi-kara-Shitawarete-Masu-225x319.png",
                "url": "/komik-indo/manga/100-nin-no-eiyuu-o-sodateta-saikyou-yogensha-wa-boukensha-ni-natte-mo-sekaijuu-no-deshi-kara-shitawarete-masu/",
                "rating": "6.71"
            },
            {
                "title": "25-ji no Ghost Writer",
                "slug": "25-ji-no-ghost-writer",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2021/01/Komik-25-ji-no-Ghost-Writer-224x319.jpg",
                "url": "/komik-indo/manga/25-ji-no-ghost-writer/",
                "rating": "8.09"
            },
            {
                "title": "31 Heroes",
                "slug": "31-heroes",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2021/01/Komik-31-Heroes-213x319.jpg",
                "url": "/komik-indo/manga/31-heroes/",
                "rating": "7.86"
            },
            {
                "title": "5 Seconds Before Falling in Love with a Witch",
                "slug": "5-seconds-before-falling-in-love-with-a-witch",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2022/04/Komik-5-Seconds-Before-Falling-in-Love-with-a-Witch-222x319.png",
                "url": "/komik-indo/manga/5-seconds-before-falling-in-love-with-a-witch/",
                "rating": "7.91"
            },
            {
                "title": "666 Satan",
                "slug": "666-satan",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-666-Satan-203x319.png",
                "url": "/komik-indo/manga/666-satan/",
                "rating": "7.98"
            },
            {
                "title": "8Kaijuu",
                "slug": "8kaijuu",
                "url": "/komik-indo/manga/8kaijuu/",
                "rating": "8.8"
            },
            {
                "title": "A Boy Reading a Porn Mag That Was Dropped on the Roadside and a Gal",
                "slug": "a-boy-reading-a-porn-mag-that-was-dropped-on-the-roadside-and-a-gal",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2022/03/Komik-A-Boy-Reading-a-Porn-Mag-That-Was-Dropped-on-the-Roadside-and-a-Gal-226x319.jpg",
                "url": "/komik-indo/manga/a-boy-reading-a-porn-mag-that-was-dropped-on-the-roadside-and-a-gal/",
                "rating": "6.2"
            },
            {
                "title": "A Clean-Freak Girl’s Exception",
                "slug": "a-clean-freak-girls-exception",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2022/10/Komik-A-Clean-Freak-Girls-Exception-236x236.png",
                "url": "/komik-indo/manga/a-clean-freak-girls-exception/",
                "rating": "7.21"
            },
            {
                "title": "A Day in the Life of a Stupid Gyaru and a Glamourous Gyaru",
                "slug": "a-day-in-the-life-of-a-stupid-gyaru-and-a-glamourous-gyaru",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2021/08/Komik-A-Day-in-the-Life-of-a-Stupid-Gyaru-and-a-Glamourous-Gyaru-226x319.jpg",
                "url": "/komik-indo/manga/a-day-in-the-life-of-a-stupid-gyaru-and-a-glamourous-gyaru/",
                "rating": "7"
            },
            {
                "title": "A Fun and Friendly Workplace",
                "slug": "a-fun-and-friendly-workplace",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2023/02/Komik-A-Fun-and-Friendly-Workplace-226x319.png",
                "url": "/komik-indo/manga/a-fun-and-friendly-workplace/",
                "rating": "7.66"
            },
            {
                "title": "A Girl Confesses Her Feelings With the Help of Alcohol",
                "slug": "a-girl-confesses-her-feelings-with-the-help-of-alcohol",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2023/03/Komik-A-Girl-Confesses-Her-Feelings-With-the-Help-of-Alcohol-201x319.png",
                "url": "/komik-indo/manga/a-girl-confesses-her-feelings-with-the-help-of-alcohol/",
                "rating": "7.29"
            },
            {
                "title": "A Girl Whose Dark Circles in Her Eyes Disappear As the Story Progresses.",
                "slug": "305456-a-girl-whose-dark-circles-in-her-eyes-disappear-as-the-story-progresses",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2023/01/Komik-A-Girl-Whose-Dark-Circles-in-Her-Eyes-Disappear-As-the-Story-Progresses-227x319.jpg",
                "url": "/komik-indo/manga/305456-a-girl-whose-dark-circles-in-her-eyes-disappear-as-the-story-progresses/",
                "rating": "7.68"
            },
            {
                "title": "A Girl With Abnormally Sensitive Ears",
                "slug": "a-girl-with-abnormally-sensitive-ears",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2022/12/Komik-A-Girl-With-Abnormally-Sensitive-Ears-227x319.png",
                "url": "/komik-indo/manga/a-girl-with-abnormally-sensitive-ears/",
                "rating": "7.35"
            },
            {
                "title": "A Gyaru and Otaku who have entered a school where they will have to dropout if they cannot get a lover!",
                "slug": "a-gyaru-and-otaku-who-have-entered-a-school-where-they-will-have-to-dropout-if-they-cannot-get-a-lover",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2021/09/Komik-A-Gyaru-and-Otaku-who-have-entered-a-school-where-they-will-have-to-dropout-if-they-cannot-get-a-lover-225x319.png",
                "url": "/komik-indo/manga/a-gyaru-and-otaku-who-have-entered-a-school-where-they-will-have-to-dropout-if-they-cannot-get-a-lover/",
                "rating": "7"
            },
            {
                "title": "A Helpless Childhood Friend",
                "slug": "a-helpless-childhood-friend",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2022/08/Komik-A-Helpless-Childhood-Friend-219x319.jpg",
                "url": "/komik-indo/manga/a-helpless-childhood-friend/",
                "rating": "7.43"
            },
            {
                "title": "A Kouhai Who Always Has A Poker Face Challenged Me to A Game of Old Maid",
                "slug": "a-kouhai-who-always-has-a-poker-face-challenged-me-to-a-game-of-old-maid",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2021/03/Komik-A-Kouhai-Who-Always-Has-A-Poker-Face-Challenged-Me-to-A-Game-of-Old-Maid-229x319.jpg",
                "url": "/komik-indo/manga/a-kouhai-who-always-has-a-poker-face-challenged-me-to-a-game-of-old-maid/",
                "rating": "8.28"
            },
            {
                "title": "A Lazy Guy Woke Up as a Girl One Morning",
                "slug": "a-lazy-guy-woke-up-as-a-girl-one-morning",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2022/08/Komik-A-Lazy-Guy-Woke-Up-as-a-Girl-One-Morning-224x319.jpg",
                "url": "/komik-indo/manga/a-lazy-guy-woke-up-as-a-girl-one-morning/",
                "rating": "7.36"
            },
            {
                "title": "A Little Secret Recipe",
                "slug": "a-little-secret-recipe",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2021/02/Komik-A-Little-Secret-Recipe-183x319.png",
                "url": "/komik-indo/manga/a-little-secret-recipe/",
                "rating": "7.96"
            },
            {
                "title": "A man meets a kuchisake onna",
                "slug": "a-man-meets-a-kuchisake-onna",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2021/10/Komik-A-man-meets-a-kuchisake-onna-226x319.jpg",
                "url": "/komik-indo/manga/a-man-meets-a-kuchisake-onna/",
                "rating": "6.61"
            },
            {
                "title": "A Manga About A Gyaru That Loves a Gyaru That’s Friendly to Otaku",
                "slug": "a-manga-about-a-gyaru-that-loves-a-gyaru-thats-friendly-to-otaku",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2021/04/Komik-A-Manga-About-A-Gyaru-That-Loves-a-Gyaru-Thats-Friendly-to-Otaku-236x315.jpg",
                "url": "/komik-indo/manga/a-manga-about-a-gyaru-that-loves-a-gyaru-thats-friendly-to-otaku/",
                "rating": "7"
            },
            {
                "title": "A New Living Arrangement With My Friend ♂ Turned Succubus",
                "slug": "a-new-living-arrangement-with-my-friend-%e2%99%82-turned-succubus",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2022/04/Komik-A-New-Living-Arrangement-With-My-Friend-Turned-Succubus-232x319.jpg",
                "url": "/komik-indo/manga/a-new-living-arrangement-with-my-friend-%e2%99%82-turned-succubus/",
                "rating": "7"
            },
            {
                "title": "A Nyakuza Manga",
                "slug": "a-nyakuza-manga",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2023/05/Komik-A-Nyakuza-Manga-228x319.png",
                "url": "/komik-indo/manga/a-nyakuza-manga/",
                "rating": "7.82"
            },
            {
                "title": "A plot to undermine the Hero",
                "slug": "a-plot-to-undermine-the-hero",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2021/11/Komik-A-plot-to-undermine-the-Hero-236x234.png",
                "url": "/komik-indo/manga/a-plot-to-undermine-the-hero/",
                "rating": "6.51"
            },
            {
                "title": "A Pocket Full of Holes Forgets Everything",
                "slug": "a-pocket-full-of-holes-forgets-everything",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2021/12/Komik-A-Pocket-Full-of-Holes-Forgets-Everything-219x319.jpg",
                "url": "/komik-indo/manga/a-pocket-full-of-holes-forgets-everything/",
                "rating": "7.76"
            },
            {
                "title": "A Romantic Comedy That Begins with a Dream",
                "slug": "a-romantic-comedy-that-begins-with-a-dream",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2022/04/Komik-A-Romantic-Comedy-That-Begins-with-a-Dream-217x319.jpg",
                "url": "/komik-indo/manga/a-romantic-comedy-that-begins-with-a-dream/",
                "rating": "7.24"
            },
            {
                "title": "A Romcom About a Dark Witch and a Zombie",
                "slug": "a-romcom-about-a-dark-witch-and-a-zombie",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2023/04/Komik-A-Romcom-About-a-Dark-Witch-and-a-Zombie-226x319.jpg",
                "url": "/komik-indo/manga/a-romcom-about-a-dark-witch-and-a-zombie/",
                "rating": "7.2"
            },
            {
                "title": "A RomCom Protagonist Who Knows How to Handle Himself",
                "slug": "a-romcom-protagonist-who-knows-how-to-handle-himself",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2021/02/Komik-A-RomCom-Protagonist-Who-Knows-How-to-Handle-Himself-236x154.png",
                "url": "/komik-indo/manga/a-romcom-protagonist-who-knows-how-to-handle-himself/",
                "rating": "8.18"
            },
            {
                "title": "A Romcom Where Defying the Honor Student Girlfriend Is Not an Option",
                "slug": "a-romcom-where-defying-the-honor-student-girlfriend-is-not-an-option",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2022/05/Komik-A-Romcom-Where-Defying-the-Honor-Student-Girlfriend-Is-Not-an-Option-226x319.jpg",
                "url": "/komik-indo/manga/a-romcom-where-defying-the-honor-student-girlfriend-is-not-an-option/",
                "rating": "7.54"
            },
            {
                "title": "A Saint Joined My Party!",
                "slug": "a-saint-joined-my-party",
                "poster_url": "https://komikindo.ch/wp-content/uploads/2021/03/Komik-A-Saint-Joined-My-Party-213x319.jpg",
                "url": "/komik-indo/manga/a-saint-joined-my-party/",
                "rating": "7.29"
            }
        ],
        "page": 1,
        "totalPage": 24,
        "next_page_num": 2,
        "hasNext": true,
        "totalMangas": 30
    }
}
```
