import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { UTApi } from "uploadthing/server";
import { UTFile } from "uploadthing/server";
import * as fs from "fs";
import * as path from "path";

function inferCategory(name: string, description: string): string {
  const text = (name + " " + description).toLowerCase();
  if (text.includes("vitamin") || text.includes("omega") || text.includes("magnesium") || text.includes("probiotik") || text.includes("nahrungsergänzung") || text.includes("mineral")) return "Supplements";
  if (text.includes("auge") || text.includes("augentropfen")) return "Eye Care";
  if (text.includes("reinigung") || text.includes("lotion") || text.includes("creme") || text.includes("salbe") || text.includes("wund") || text.includes("haut")) return "Dermatology";
  if (text.includes("allergi") || text.includes("antihistamin")) return "Allergy";
  if (text.includes("schmerz") || text.includes("ibuprofen") || text.includes("paracetamol") || text.includes("diclo")) return "Pain Relief";
  if (text.includes("darm") || text.includes("blähung") || text.includes("verstopf") || text.includes("durchfall") || text.includes("abführ") || text.includes("magen") || text.includes("reizdarmsyndrom")) return "Gastroenterology";
  if (text.includes("harnweg") || text.includes("blase") || text.includes("prostata")) return "Urology";
  if (text.includes("husten") || text.includes("nase") || text.includes("atem") || text.includes("sinupret")) return "Respiratory";
  if (text.includes("haar") || text.includes("haarausfall") || text.includes("minoxidil")) return "Hair Care";
  if (text.includes("intim") || text.includes("vaginal") || text.includes("wechseljahr") || text.includes("zervix")) return "Women's Health";
  if (text.includes("baby") || text.includes("kind") || text.includes("milchschorf")) return "Pediatrics";
  if (text.includes("bluthochdruck") || text.includes("ramipril")) return "Cardiovascular";
  if (text.includes("nerv") || text.includes("schlaf") || text.includes("unruhe") || text.includes("homöo")) return "Neurology";
  return "General Medicine";
}

function inferDosageForm(name: string, packSize: string): string {
  const text = (name + " " + packSize).toLowerCase();
  if (text.includes("schmelztablet") || text.includes("filmtablet") || text.includes("dragée") || text.includes("tablette")) return "tablet";
  if (text.includes("kapsel") || text.includes("kapseln")) return "capsule";
  if (text.includes("spray")) return "spray";
  if (text.includes("augentropfen") || (text.includes("tropfen") && text.includes("auge"))) return "eye drops";
  if (text.includes("tropfen")) return "drops";
  if (text.includes("saft") || text.includes("lösung") || text.includes("flüssig")) return "syrup";
  if (text.includes("gel")) return "gel";
  if (text.includes("creme") || text.includes("salbe")) return "cream";
  if (text.includes("lotion")) return "lotion";
  if (text.includes("gummi")) return "gummy";
  return "other";
}

function inferStrength(name: string): string {
  const match = name.match(/(\d+[\.,]?\d*\s?(mg|ml|g|µg|i\.e\.|%|iu|st)(\/\d+\s?(mg|ml|g))?)/i);
  return match ? match[0].trim() : "N/A";
}

function inferPrescriptionRequired(name: string): boolean {
  return /ramipril|minoxidil|verschreibungspflicht/i.test(name);
}

const rawMedicines = [
  { pzn: "4020784",  name: "Panthenol Spray, 46,3 mg/g Schaum zur Anwendung auf der Haut",  packSize: "130 g",      price: 16.95, description: "Schaumspray zur Anwendung auf der Haut. Fördert die Regeneration gereizter oder geschädigter Haut und spendet Feuchtigkeit.", sideEffects: "Selten: Hautreizungen oder allergische Reaktionen." },
  { pzn: "13476520", name: "NORSAN Omega-3 Total",                                            packSize: "200 ml",     price: 27.00, description: "Flüssiges Omega-3-Öl aus Fisch. Unterstützt Herz, Gehirn und Gelenke.", sideEffects: "Selten: fischiger Nachgeschmack, leichte Magenprobleme." },
  { pzn: "13476394", name: "NORSAN Omega-3 Vegan",                                            packSize: "100 ml",     price: 29.00, description: "Pflanzliches Omega-3 aus Algen. Geeignet für Vegetarier und Veganer.", sideEffects: "Selten: leichte Magenbeschwerden." },
  { pzn: "13512730", name: "NORSAN Omega-3 Kapseln",                                          packSize: "120 st",     price: 29.00, description: "Omega-3-Kapseln zur täglichen Nahrungsergänzung.", sideEffects: "Selten: Aufstoßen, leichte Übelkeit." },
  { pzn: "16507327", name: "Vividrin iso EDO antiallergische Augentropfen",                   packSize: "30x0.5 ml",  price: 8.28,  description: "Konservierungsmittelfreie Augentropfen zur Linderung allergischer Beschwerden wie Juckreiz und Roetung.", sideEffects: "Selten: voruebergehendes Brennen oder Stechen." },
  { pzn: "795287",   name: "Aqualibra 80 mg/90 mg/180 mg Filmtabletten",                      packSize: "60 st",      price: 27.82, description: "Pflanzliches Arzneimittel zur Unterstuetzung der Blasenfunktion.", sideEffects: "Selten: Magenreizungen, allergische Reaktionen." },
  { pzn: "14050243", name: "Vitasprint Pro Energie",                                          packSize: "8 st",       price: 15.95, description: "Nahrungsergaenzungsmittel mit B-Vitaminen und Aminosaeuren zur Verringerung von Muedigkeit.", sideEffects: "Keine bekannt bei bestimmungsgemaessem Gebrauch." },
  { pzn: "7114824",  name: "Cystinol akut",                                                   packSize: "60 st",      price: 26.50, description: "Pflanzliches Arzneimittel zur Behandlung akuter Harnwegsinfektionen.", sideEffects: "Selten: Magen-Darm-Beschwerden, allergische Reaktionen." },
  { pzn: "4884527",  name: "Cromo-ratiopharm Augentropfen Einzeldosis",                       packSize: "20x0.5 ml",  price: 7.59,  description: "Antiallergische Augentropfen zur Vorbeugung und Behandlung von allergischen Augenbeschwerden.", sideEffects: "Selten: Brennen, Stechen oder verschwommenes Sehen." },
  { pzn: "15999676", name: "Kijimea Reizdarm PRO",                                            packSize: "28 st",      price: 38.99, description: "Medizinisches Produkt zur Linderung von Symptomen des Reizdarmsyndroms.", sideEffects: "Keine bekannt." },
  { pzn: "15210915", name: "Mucosolvan 1 mal täglich Retardkapseln",                          packSize: "50 st",      price: 39.97, description: "Langwirksames Arzneimittel zur Schleimlosung bei Husten.", sideEffects: "Gelegentlich: Uebelkeit, Erbrechen, Durchfall." },
  { pzn: "16487346", name: "OMNi-BiOTiC SR-9 mit B-Vitaminen",                               packSize: "28x3 g",     price: 44.50, description: "Probiotikum mit B-Vitaminen zur Unterstuetzung der Darmflora und des Energiestoffwechsels.", sideEffects: "Sehr selten: voruebergehende Blaehungen bei Therapiebeginn." },
  { pzn: "16781761", name: "Osa Schorf Spray",                                                packSize: "30 ml",      price: 15.45, description: "Pflegespray zur sanften Entfernung von Milchschorf und trockener Kopfhaut bei Babys.", sideEffects: "Keine bekannt." },
  { pzn: "16908486", name: "Multivitamin Fruchtgummibärchen vegan zuckerfrei",                packSize: "60 st",      price: 12.74, description: "Vegane, zuckerfreie Multivitamin-Gummibärchen zur taeglichen Versorgung mit Vitaminen.", sideEffects: "Keine bekannt bei bestimmungsgemaessem Gebrauch." },
  { pzn: "16507540", name: "Iberogast Classic Fluessigkeit zum Einnehmen",                    packSize: "50 ml",      price: 28.98, description: "Pflanzliches Arzneimittel bei Magen-Darm-Beschwerden.", sideEffects: "Selten: Uebelkeit, allergische Hautreaktionen." },
  { pzn: "18389398", name: "COLPOFIX",                                                        packSize: "40 ml",      price: 49.60, description: "Vaginalgel zur Unterstuetzung der Gesundheit der Zervixschleimhaut.", sideEffects: "Selten: lokale Irritationen." },
  { pzn: "17396686", name: "Augentropfen RedCare",                                            packSize: "10 ml",      price: 12.69, description: "Befeuchtende Augentropfen bei trockenen oder gereizten Augen.", sideEffects: "Selten: voruebergehendes Brennen nach Eintraeufeln." },
  { pzn: "17931783", name: "MULTILAC Darmsynbiotikum",                                        packSize: "10 st",      price: 9.99,  description: "Kombination aus Pro- und Praebiotika zur Unterstuetzung der Verdauung.", sideEffects: "Sehr selten: Blaehungen zu Beginn der Einnahme." },
  { pzn: "18216723", name: "SAW PALMETO Sägepalme 350 mg",                                    packSize: "100 st",     price: 8.47,  description: "Pflanzliches Nahrungsergaenzungsmittel zur Unterstuetzung der Prostatafunktion.", sideEffects: "Selten: Magenbeschwerden, Kopfschmerzen." },
  { pzn: "18188323", name: "Paracetamol apodiscounter 500 mg Tabletten",                      packSize: "20 st",      price: 2.06,  description: "Schmerz- und fiebersenkendes Arzneimittel.", sideEffects: "Selten: Hautreaktionen, Leberschaeden bei Ueberdosierung." },
  { pzn: "18657640", name: "Prostata Men Kapseln",                                            packSize: "60 st",      price: 19.99, description: "Nahrungsergaenzungsmittel zur Unterstuetzung der Prostatagesundheit.", sideEffects: "Keine bekannt." },
  { pzn: "18769758", name: "Natural Intimate Creme",                                          packSize: "50 ml",      price: 18.90, description: "Pflegecreme zur Befeuchtung und zum Schutz des sensiblen Intimbereichs.", sideEffects: "Selten: lokale Hautreizungen." },
  { pzn: "18317737", name: "proBIO 6 Probiotik Kapseln APOMIA",                              packSize: "30 st",      price: 34.90, description: "Probiotische Kapseln zur Unterstuetzung einer gesunden Darmflora.", sideEffects: "Selten: leichte Blaehungen zu Therapiebeginn." },
  { pzn: "18222095", name: "Eucerin DERMOPURE Triple Effect Reinigungsgel",                   packSize: "150 ml",     price: 17.25, description: "Reinigungsgel fuer unreine Haut, reduziert Unreinheiten und Pickelmale.", sideEffects: "Selten: Hauttrockenheit, leichte Reizungen." },
  { pzn: "19140755", name: "frida baby FlakeFixer",                                           packSize: "1 st",       price: 0.00,  description: "Sanfte Pflege zur Entfernung von Milchschorf bei Babys.", sideEffects: "Keine bekannt." },
  { pzn: "18760556", name: "Vitasprint Duo Energie",                                          packSize: "20 st",      price: 16.95, description: "Nahrungsergaenzungsmittel mit Vitaminen und Mineralstoffen zur Steigerung der Energie.", sideEffects: "Keine bekannt bei bestimmungsgemaessem Gebrauch." },
  { pzn: "1580241",  name: "Bepanthen Wund- und Heilsalbe 50 mg/g",                           packSize: "20 g",       price: 7.69,  description: "Salbe zur Unterstuetzung der Wundheilung und Pflege trockener Haut.", sideEffects: "Selten: Kontaktallergien." },
  { pzn: "19296256", name: "V-Biotics Flora Complex",                                         packSize: "19 g",       price: 19.90, description: "Probiotisches Nahrungsergaenzungsmittel zur Unterstuetzung von Darm und Immunsystem.", sideEffects: "Selten: leichte Verdauungsbeschwerden." },
  { pzn: "19342855", name: "Aveeno Skin Relief Body Lotion",                                  packSize: "300 ml",     price: 14.99, description: "Beruhigende Koerperlotion fuer sehr trockene und juckende Haut.", sideEffects: "Selten: Hautreizungen bei Unvertraeglichkeit." },
  { pzn: "19486198", name: "Centrum Vital+ Mentale Leistung",                                 packSize: "30 st",      price: 19.95, description: "Multivitaminpraeparat zur Unterstuetzung der geistigen Leistungsfaehigkeit.", sideEffects: "Selten: Uebelkeit bei Einnahme auf nuechternen Magen." },
  { pzn: "19280947", name: "Redcare Wundschutzcreme",                                         packSize: "100 ml",     price: 14.39, description: "Schutzcreme fuer gereizte und empfindliche Haut.", sideEffects: "Selten: Kontaktreizungen." },
  { pzn: "19720688", name: "Cetaphil Sanft glaettende SA Reinigung",                          packSize: "236 ml",     price: 13.95, description: "Sanfte Reinigung mit Salicylsaeure fuer raue und unebene Haut.", sideEffects: "Selten: Hauttrockenheit bei empfindlicher Haut." },
  { pzn: "3554928",  name: "Magnesium Verla N Dragees magensaftresistente Tabletten",          packSize: "50 st",      price: 6.40,  description: "Magnesiumpraeparat zur Unterstuetzung von Muskeln und Nerven.", sideEffects: "Gelegentlich: Durchfall bei hoher Dosierung." },
  { pzn: "676714",   name: "Livocab direkt Augentropfen 0,05% Suspension",                    packSize: "4 ml",       price: 14.99, description: "Schnell wirksame Augentropfen bei allergischen Augenbeschwerden.", sideEffects: "Selten: Brennen, Stechen nach Eintraeufeln." },
  { pzn: "2579607",  name: "Cetirizin HEXAL Tropfen bei Allergien 10 mg/ml",                  packSize: "10 ml",      price: 13.19, description: "Antihistaminikum zur Linderung von Allergiesymptomen.", sideEffects: "Schlaefrigkeit, Mundtrockenheit, Muedigkeit." },
  { pzn: "1338066",  name: "Loperamid akut 1A Pharma 2 mg Hartkapseln",                       packSize: "10 st",      price: 3.93,  description: "Arzneimittel zur Behandlung von akutem Durchfall.", sideEffects: "Selten: Verstopfung, Bauchkraempfe, Schwindel." },
  { pzn: "766794",   name: "Ramipril 1A Pharma 10 mg Tabletten",                              packSize: "20 st",      price: 12.59, description: "Verschreibungspflichtiges Arzneimittel zur Behandlung von Bluthochdruck.", sideEffects: "Reizhusten, Schwindel, Erschoepfung, Hypotonie." },
  { pzn: "1499852",  name: "GRANU FINK femina Hartkapseln",                                   packSize: "30 st",      price: 20.29, description: "Pflanzliches Arzneimittel zur Unterstuetzung der Blasengesundheit bei Frauen.", sideEffects: "Selten: Magen-Darm-Beschwerden." },
  { pzn: "4909523",  name: "Vitasprint B12 Kapseln",                                          packSize: "20 st",      price: 17.04, description: "Vitamin-B12-Praeparat zur Unterstuetzung von Energie und Nervenfunktion.", sideEffects: "Keine bekannt bei bestimmungsgemaessem Gebrauch." },
  { pzn: "605588",   name: "Sinupret Saft",                                                   packSize: "100 ml",     price: 13.30, description: "Pflanzliches Arzneimittel bei Nasennebenhoehlenentzuendungen.", sideEffects: "Selten: Magen-Darm-Beschwerden, allergische Reaktionen." },
  { pzn: "2547582",  name: "Nurofen 200 mg Schmelztabletten Lemon",                           packSize: "12 st",      price: 10.98, description: "Ibuprofen-Schmerzmittel in schnell loeslicher Form.", sideEffects: "Gelegentlich: Magenschmerzen, Uebelkeit." },
  { pzn: "4132750",  name: "Vitamin B-Komplex-ratiopharm",                                    packSize: "60 st",      price: 24.97, description: "Kombination verschiedener B-Vitamine zur Unterstuetzung des Nervensystems.", sideEffects: "Selten: Hautreaktionen, Magen-Darm-Beschwerden." },
  { pzn: "6560421",  name: "Calmvalera Hevert Tropfen",                                       packSize: "100 ml",     price: 35.97, description: "Homoeopathisches Arzneimittel bei nervoser Unruhe und Schlafstoerungen.", sideEffects: "Keine bekannt." },
  { pzn: "16815862", name: "femiLoges 4 mg magensaftresistente Tabletten",                    packSize: "30 st",      price: 20.44, description: "Hormonfreies Arzneimittel zur Linderung von Wechseljahresbeschwerden.", sideEffects: "Selten: Magen-Darm-Beschwerden." },
  { pzn: "8871266",  name: "Umckaloabo Saft fuer Kinder",                                     packSize: "120 ml",     price: 13.15, description: "Pflanzlicher Saft zur Behandlung von Atemwegsinfektionen bei Kindern.", sideEffects: "Selten: Magen-Darm-Beschwerden, Hautreaktionen." },
  { pzn: "6800196",  name: "DulcoLax Dragees 5 mg magensaftresistente Tabletten",              packSize: "100 st",     price: 22.90, description: "Abfuehrmittel zur kurzfristigen Behandlung von Verstopfung.", sideEffects: "Haeufig: Bauchkraempfe, Durchfall." },
  { pzn: "4704198",  name: "Diclo-ratiopharm Schmerzgel",                                     packSize: "50 g",       price: 8.89,  description: "Schmerzgel zur aeusseren Anwendung bei Muskel- und Gelenkschmerzen.", sideEffects: "Selten: Hautreizungen, Roetung an der Applikationsstelle." },
  { pzn: "10391763", name: "Minoxidil BIO-H-TIN-Pharma 20 mg/ml Spray",                       packSize: "60 ml",      price: 22.50, description: "Loesung zur Anwendung auf der Kopfhaut bei erblich bedingtem Haarausfall.", sideEffects: "Kopfhautreizung, Juckreiz, selten systemische Wirkungen." },
  { pzn: "10810214", name: "Hyaluron-ratiopharm Augentropfen",                                 packSize: "10 ml",      price: 13.74, description: "Befeuchtende Augentropfen mit Hyaluronsaeure bei trockenen Augen.", sideEffects: "Selten: kurzzeitiges Verschwommensehen nach Eintraeufeln." },
  { pzn: "10796980", name: "FeniHydrocort Creme 0,25%",                                       packSize: "20 g",       price: 8.59,  description: "Kortisonhaltige Creme zur Behandlung leichter Hautentzuendungen und Juckreiz.", sideEffects: "Bei laengerem Gebrauch: Hautatrophie, Striae." },
  { pzn: "11678159", name: "Eucerin UreaRepair PLUS Lotion 10%",                               packSize: "400 ml",     price: 27.75, description: "Intensiv pflegende Lotion fuer sehr trockene und raue Haut.", sideEffects: "Selten: voruebergehendes Brennen bei stark rissiger Haut." },
  { pzn: "12423869", name: "Vigantolvit 2000 I.E. Vitamin D3",                                 packSize: "120 st",     price: 17.99, description: "Vitamin-D-Praeparat zur Unterstuetzung von Knochen und Immunsystem.", sideEffects: "Bei Ueberdosierung: Hyperkalzaemie." },
];

const alternativeGroups = [
  { pzns: ["13476520", "13476394", "13512730"],                                   reason: "same brand, different Omega-3 form" },
  { pzns: ["14050243", "18760556", "4909523"],                                    reason: "same brand Vitasprint, energy/B-vitamin range" },
  { pzns: ["16507327", "4884527", "676714"],                                      reason: "same category, antiallergic eye drops" },
  { pzns: ["17396686", "10810214"],                                               reason: "same category, moisturising eye drops" },
  { pzns: ["15999676", "16487346", "17931783", "18317737", "19296256"],           reason: "same category, probiotic / gut health" },
  { pzns: ["18188323", "2547582"],                                                reason: "same category, oral pain relief" },
  { pzns: ["4704198", "2547582"],                                                 reason: "same generic group, NSAID / pain relief" },
  { pzns: ["795287", "7114824", "1499852"],                                       reason: "same category, urological / bladder health" },
  { pzns: ["18216723", "18657640"],                                               reason: "same category, prostate health" },
  { pzns: ["1580241", "19280947", "10796980"],                                    reason: "same category, wound and skin protection creams" },
  { pzns: ["18222095", "19720688"],                                               reason: "same category, facial cleansers" },
  { pzns: ["11678159", "19342855"],                                               reason: "same category, body moisturisers for dry skin" },
  { pzns: ["16507327", "2579607"],                                                reason: "same category, allergy relief" },
  { pzns: ["4132750", "14050243", "18760556", "4909523", "19486198", "12423869"], reason: "same category, vitamin supplements" },
  { pzns: ["605588", "15210915"],                                                 reason: "same category, respiratory relief" },
];

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL environment variable is not set");

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log("Seeding database...");

  await prisma.medicineAlternative.deleteMany();
  await prisma.medicineBatch.deleteMany();
  await prisma.medicine.deleteMany();
  console.log("  Cleared existing medicines, batches, and alternatives");

  const pznToId = new Map<string, string>();

  const utapi = new UTApi();

  for (const item of rawMedicines) {
    // Upload image to UploadThing if available locally
    let imageUrl: string | null = null;
    const paddedPzn = item.pzn.padStart(8, "0");
    const imagePath = path.join(process.cwd(), "public", "medicine", `${paddedPzn}.webp`);

    if (fs.existsSync(imagePath)) {
      try {
        const buffer = fs.readFileSync(imagePath);
        const utFile = new UTFile([buffer], `${paddedPzn}.webp`, { type: "image/webp" });
        const result = await utapi.uploadFiles(utFile);
        if (result.data) {
          imageUrl = result.data.ufsUrl;
          console.log(`    📷 Uploaded ${paddedPzn}.webp → ${imageUrl}`);
        }
      } catch (err) {
        console.log(`    ⚠️ Failed to upload image for ${item.pzn}:`, err);
      }
    }

    const medicine = await prisma.medicine.create({
      data: {
        name:                 item.name,
        genericName:          null,
        brand:                null,
        category:             inferCategory(item.name, item.description),
        dosageForm:           inferDosageForm(item.name, item.packSize),
        strength:             inferStrength(item.name),
        packSize:             item.packSize,
        prescriptionRequired: inferPrescriptionRequired(item.name),
        description:          item.description,
        sideEffects:          item.sideEffects,
        imageUrl,
        batches: {
          create: {
            batchNumber:  `BATCH-${item.pzn}-001`,
            expiryDate:   new Date("2027-12-31"),
            quantity:     100,
            unitPrice:    item.price,
            reorderLevel: 10,
          },
        },
      },
    });

    pznToId.set(item.pzn, medicine.id);
    console.log(`  + ${medicine.name}`);
  }

  let altCount = 0;
  for (const group of alternativeGroups) {
    const ids = group.pzns
      .map((pzn) => pznToId.get(pzn))
      .filter((id): id is string => !!id);

    for (const originalId of ids) {
      for (const alternativeId of ids) {
        if (originalId === alternativeId) continue;
        try {
          await prisma.medicineAlternative.create({
            data: { originalId, alternativeId, reason: group.reason },
          });
          altCount++;
        } catch {
          // skip duplicate pairs from overlapping groups
        }
      }
    }
  }

  console.log(`\nSeeded ${rawMedicines.length} medicines and ${altCount} alternative links!`);
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});