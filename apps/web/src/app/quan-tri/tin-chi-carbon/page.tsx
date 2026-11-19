"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, MapPin, X } from "lucide-react";
import {
  Button,
  Card,
  Container,
  Field,
  Input,
  Select,
  Switch,
} from "@/components/ui";

interface CarbonBatchItem {
  id: string;
  code: string;
  title: string;
  country: string;
  vintage: string;
  standard: "VCS_VERRA" | "GOLD_STANDARD";
  category: "forestry" | "agriculture" | "biochar";
  availableCredits: number;
  pricePerCredit: number;
  corsiaNote: string;
  vnEtsNote: string;
  imageUrl: string;
  published: boolean;
}

const INITIAL_BATCHES: CarbonBatchItem[] = [
  {
    id: "1",
    code: "LOT-BR-2025-1",
    title: "Phục hồi rừng nhiệt đới",
    country: "Brazil",
    vintage: "2025",
    standard: "VCS_VERRA",
    category: "forestry",
    availableCredits: 630,
    pricePerCredit: 250000,
    corsiaNote: "CORSIA: Cần đối chiếu lô",
    vnEtsNote: "VN ETS: Chưa xác nhận",
    imageUrl:
      "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80",
    published: true,
  },
  {
    id: "2",
    code: "LOT-IN-2024-2",
    title: "Khí sinh học cộng đồng",
    country: "Ấn Độ",
    vintage: "2024",
    standard: "GOLD_STANDARD",
    category: "agriculture",
    availableCredits: 450,
    pricePerCredit: 300000,
    corsiaNote: "CORSIA: Cần đối chiếu lô",
    vnEtsNote: "VN ETS: Chưa xác nhận",
    imageUrl:
      "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=800&q=80",
    published: true,
  },
  {
    id: "3",
    code: "LOT-BR-2025-3",
    title: "Than sinh học nông nghiệp",
    country: "Brazil",
    vintage: "2025",
    standard: "VCS_VERRA",
    category: "biochar",
    availableCredits: 200,
    pricePerCredit: 600000,
    corsiaNote: "CORSIA: Cần đối chiếu lô",
    vnEtsNote: "VN ETS: Chưa xác nhận",
    imageUrl:
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80",
    published: true,
  },
];

const ORDERS_MOCK = [
  {
    id: "DH-001",
    buyer: "Công ty TNHH VinaTech",
    batch: "Phục hồi rừng nhiệt đới",
    qty: 120,
    total: 30000000,
    status: "Chờ đối soát",
  },
  {
    id: "DH-002",
    buyer: "CTCP Thực phẩm Sao Mai",
    batch: "Khí sinh học cộng đồng",
    qty: 200,
    total: 60000000,
    status: "Hoàn tất",
  },
];

const SELLERS_MOCK = [
  {
    id: "BB-01",
    org: "HTX Nông nghiệp Xanh Tây Nguyên",
    type: "Than sinh học (biochar)",
    volume: "1.500 tCO2e/năm",
    status: "Chờ thẩm định",
  },
];

const VINTAGE_OPTIONS = [
  { value: "2024", label: "2024" },
  { value: "2025", label: "2025" },
];

const STANDARD_OPTIONS = [
  { value: "VCS_VERRA", label: "VCS · Verra" },
  { value: "GOLD_STANDARD", label: "Gold Standard" },
];

const CATEGORY_OPTIONS = [
  { value: "forestry", label: "Trồng & phục hồi rừng" },
  { value: "agriculture", label: "Nông nghiệp bền vững" },
  { value: "biochar", label: "Than sinh học (biochar)" },
];

export default function CarbonCreditsAdminPage() {
  const [tab, setTab] = useState<"batches" | "orders" | "sellers">("batches");
  const [batches, setBatches] = useState<CarbonBatchItem[]>(INITIAL_BATCHES);
  const [search, setSearch] = useState("");
  const [standardFilter, setStandardFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [vintageFilter, setVintageFilter] = useState("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [country, setCountry] = useState("Brazil");
  const [vintage, setVintage] = useState("2025");
  const [standard, setStandard] = useState<"VCS_VERRA" | "GOLD_STANDARD">(
    "VCS_VERRA",
  );
  const [category, setCategory] = useState<
    "forestry" | "agriculture" | "biochar"
  >("forestry");
  const [availableCredits, setAvailableCredits] = useState(500);
  const [pricePerCredit, setPricePerCredit] = useState(250000);
  const [corsiaNote, setCorsiaNote] = useState("CORSIA: Cần đối chiếu lô");
  const [vnEtsNote, setVnEtsNote] = useState("VN ETS: Chưa xác nhận");
  const [imageUrl, setImageUrl] = useState(
    "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80",
  );
  const [published, setPublished] = useState(true);

  const filtered = batches.filter((b) => {
    const matchStd = standardFilter === "all" || b.standard === standardFilter;
    const matchCat = categoryFilter === "all" || b.category === categoryFilter;
    const matchVin = vintageFilter === "all" || b.vintage === vintageFilter;
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.country.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q);
    return matchStd && matchCat && matchVin && matchQ;
  });

  const openCreate = () => {
    setTab("batches");
    setEditingId(null);
    setCode("");
    setTitle("");
    setCountry("Brazil");
    setVintage("2025");
    setStandard("VCS_VERRA");
    setCategory("forestry");
    setAvailableCredits(500);
    setPricePerCredit(250000);
    setCorsiaNote("CORSIA: Cần đối chiếu lô");
    setVnEtsNote("VN ETS: Chưa xác nhận");
    setImageUrl(
      "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80",
    );
    setPublished(true);
    setEditorOpen(true);
  };

  const openEdit = (b: CarbonBatchItem) => {
    setTab("batches");
    setEditingId(b.id);
    setCode(b.code);
    setTitle(b.title);
    setCountry(b.country);
    setVintage(b.vintage);
    setStandard(b.standard);
    setCategory(b.category);
    setAvailableCredits(b.availableCredits);
    setPricePerCredit(b.pricePerCredit);
    setCorsiaNote(b.corsiaNote);
    setVnEtsNote(b.vnEtsNote);
    setImageUrl(b.imageUrl);
    setPublished(b.published);
    setEditorOpen(true);
  };

  const handleSave = () => {
    if (editingId) {
      setBatches((prev) =>
        prev.map((b) =>
          b.id === editingId
            ? {
                ...b,
                code: code || b.code,
                title: title || "Dự án tín chỉ carbon",
                country,
                vintage,
                standard,
                category,
                availableCredits,
                pricePerCredit,
                corsiaNote,
                vnEtsNote,
                imageUrl,
                published,
              }
            : b,
        ),
      );
    } else {
      setBatches((prev) => [
        {
          id: String(Date.now()),
          code: code || `LOT-2025-0${prev.length + 1}`,
          title: title || "Lô tín chỉ mới",
          country,
          vintage,
          standard,
          category,
          availableCredits,
          pricePerCredit,
          corsiaNote,
          vnEtsNote,
          imageUrl,
          published,
        },
        ...prev,
      ]);
    }
    setEditorOpen(false);
  };

  return (
    <Container className="space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-2">
          <Link href="/quan-tri/trong-rung">
            <Button variant="secondary" size="sm">
              Trồng rừng
            </Button>
          </Link>
          <Link href="/quan-tri/tin-chi-carbon">
            <Button size="sm">Tín chỉ Carbon</Button>
          </Link>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm lô tín chỉ
        </Button>
      </div>

      <div>
        <p className="text-xs text-stone-500">Giải pháp carbon / Mua tín chỉ</p>
        <h1 className="font-sans text-2xl font-semibold text-stone-900">
          Quản lý lô tín chỉ carbon
        </h1>
      </div>

      <div className="flex gap-6 border-b border-stone-200 text-sm font-medium">
        <button
          type="button"
          onClick={() => setTab("batches")}
          className={`border-b-2 pb-2.5 ${
            tab === "batches"
              ? "border-[#0f3d2e] text-[#0f3d2e]"
              : "border-transparent text-stone-500"
          }`}
        >
          Khám phá tín chỉ ({filtered.length} lô)
        </button>
        <button
          type="button"
          onClick={() => setTab("orders")}
          className={`border-b-2 pb-2.5 ${
            tab === "orders"
              ? "border-[#0f3d2e] text-[#0f3d2e]"
              : "border-transparent text-stone-500"
          }`}
        >
          Đơn hàng ({ORDERS_MOCK.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("sellers")}
          className={`border-b-2 pb-2.5 ${
            tab === "sellers"
              ? "border-[#0f3d2e] text-[#0f3d2e]"
              : "border-transparent text-stone-500"
          }`}
        >
          Dành cho bên bán ({SELLERS_MOCK.length})
        </button>
      </div>

      {tab === "batches" && (
        <>
          {editorOpen && (
            <Card className="space-y-4 border-stone-300 bg-stone-50/60 p-5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h2 className="font-sans text-lg font-semibold text-stone-900">
                  {editingId ? "Chỉnh sửa lô tín chỉ" : "Tạo lô tín chỉ"}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditorOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Mã lô" htmlFor="carbon-code">
                  <Input
                    id="carbon-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Tên dự án" htmlFor="carbon-title">
                    <Input
                      id="carbon-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Quốc gia" htmlFor="carbon-country">
                  <Input
                    id="carbon-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </Field>
                <Field label="Kỳ ghi nhận" htmlFor="carbon-vintage">
                  <Select
                    id="carbon-vintage"
                    value={vintage}
                    onChange={(e) => setVintage(e.target.value)}
                    options={VINTAGE_OPTIONS}
                    placeholder="Chọn kỳ ghi nhận"
                  />
                </Field>
                <Field label="Chương trình cấp" htmlFor="carbon-standard">
                  <Select
                    id="carbon-standard"
                    value={standard}
                    onChange={(e) =>
                      setStandard(
                        e.target.value as "VCS_VERRA" | "GOLD_STANDARD",
                      )
                    }
                    options={STANDARD_OPTIONS}
                    placeholder="Chọn chương trình cấp"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Loại dự án" htmlFor="carbon-category">
                  <Select
                    id="carbon-category"
                    value={category}
                    onChange={(e) =>
                      setCategory(
                        e.target.value as
                          | "forestry"
                          | "agriculture"
                          | "biochar",
                      )
                    }
                    options={CATEGORY_OPTIONS}
                    placeholder="Chọn loại dự án"
                  />
                </Field>
                <Field label="Còn bán (tín chỉ)" htmlFor="carbon-available">
                  <Input
                    id="carbon-available"
                    type="number"
                    value={availableCredits}
                    onChange={(e) =>
                      setAvailableCredits(Number(e.target.value))
                    }
                  />
                </Field>
                <Field label="Đơn giá (đ / tín chỉ)" htmlFor="carbon-price">
                  <Input
                    id="carbon-price"
                    type="number"
                    value={pricePerCredit}
                    onChange={(e) => setPricePerCredit(Number(e.target.value))}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ghi chú CORSIA" htmlFor="carbon-corsia">
                  <Input
                    id="carbon-corsia"
                    value={corsiaNote}
                    onChange={(e) => setCorsiaNote(e.target.value)}
                  />
                </Field>
                <Field label="Ghi chú VN ETS" htmlFor="carbon-vnets">
                  <Input
                    id="carbon-vnets"
                    value={vnEtsNote}
                    onChange={(e) => setVnEtsNote(e.target.value)}
                  />
                </Field>
              </div>

              <Field label="URL ảnh" htmlFor="carbon-image">
                <Input
                  id="carbon-image"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </Field>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <Switch
                  id="carbon-published-editor"
                  checked={published}
                  onChange={setPublished}
                  label="Hiển thị lô tín chỉ"
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setEditorOpen(false)}
                  >
                    Hủy
                  </Button>
                  <Button onClick={handleSave}>Lưu lô tín chỉ</Button>
                </div>
              </div>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-4">
            <Card className="h-fit space-y-5 p-4 lg:col-span-1">
              <div>
                <p className="text-xs font-semibold text-stone-800">
                  Chương trình cấp
                </p>
                <div className="mt-2 space-y-1.5 text-sm">
                  {[
                    { value: "all", label: "Tất cả" },
                    {
                      value: "VCS_VERRA",
                      label: "Verified Carbon Standard (Verra)",
                    },
                    { value: "GOLD_STANDARD", label: "Gold Standard" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 text-stone-700"
                    >
                      <input
                        type="radio"
                        name="std"
                        checked={standardFilter === opt.value}
                        onChange={() => setStandardFilter(opt.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-stone-100 pt-4">
                <p className="text-xs font-semibold text-stone-800">
                  Loại dự án
                </p>
                <div className="mt-2 space-y-1.5 text-sm">
                  {[
                    { value: "all", label: "Tất cả" },
                    { value: "forestry", label: "Trồng & phục hồi rừng" },
                    { value: "agriculture", label: "Nông nghiệp bền vững" },
                    { value: "biochar", label: "Than sinh học (biochar)" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 text-stone-700"
                    >
                      <input
                        type="radio"
                        name="cat"
                        checked={categoryFilter === opt.value}
                        onChange={() => setCategoryFilter(opt.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-stone-100 pt-4">
                <p className="text-xs font-semibold text-stone-800">
                  Kỳ ghi nhận
                </p>
                <div className="mt-2 space-y-1.5 text-sm">
                  {[
                    { value: "all", label: "Tất cả" },
                    { value: "2024", label: "2024" },
                    { value: "2025", label: "2025" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 text-stone-700"
                    >
                      <input
                        type="radio"
                        name="vin"
                        checked={vintageFilter === opt.value}
                        onChange={() => setVintageFilter(opt.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Card>

            <div className="space-y-4 lg:col-span-3">
              <Card className="p-3">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm dự án, chương trình hoặc mã lô..."
                />
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                {filtered.map((batch) => (
                  <Card
                    key={batch.id}
                    className="flex flex-col overflow-hidden"
                  >
                    <div className="relative h-40 bg-stone-100">
                      <img
                        src={batch.imageUrl}
                        alt={batch.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute top-2 right-2 rounded bg-white/95 px-2 py-0.5">
                        <Switch
                          id={`carbon-published-${batch.id}`}
                          checked={batch.published}
                          onChange={() =>
                            setBatches((prev) =>
                              prev.map((x) =>
                                x.id === batch.id
                                  ? { ...x, published: !x.published }
                                  : x,
                              ),
                            )
                          }
                          label={batch.published ? "Hiện" : "Ẩn"}
                        />
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col p-3.5">
                      <h2 className="font-sans text-base font-semibold text-stone-900">
                        {batch.title}
                      </h2>
                      <p className="mt-1 flex items-center gap-1 text-xs text-stone-600">
                        <MapPin className="h-3 w-3 text-[#0f3d2e]" />
                        <span>
                          {batch.country} · {batch.vintage}
                        </span>
                      </p>

                      <div className="mt-2.5 rounded border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-800">
                        {batch.standard === "VCS_VERRA"
                          ? "Verified Carbon Standard · Verra"
                          : "Gold Standard"}
                      </div>

                      <p className="mt-3 text-xs text-stone-500">
                        Còn bán:{" "}
                        <strong className="text-stone-800">
                          {batch.availableCredits.toLocaleString("vi-VN")} tín
                          chỉ
                        </strong>
                      </p>
                      <p className="mt-0.5 text-base font-bold text-stone-900">
                        {batch.pricePerCredit.toLocaleString("vi-VN")} đ{" "}
                        <span className="text-xs font-normal text-stone-500">
                          / tín chỉ
                        </span>
                      </p>
                      <p className="text-[11px] text-stone-500">
                        1 tín chỉ = 1 tCO₂e
                      </p>

                      <div className="mt-2.5 space-y-0.5 text-[11px] text-amber-700">
                        <p>{batch.corsiaNote}</p>
                        <p className="text-stone-500">{batch.vnEtsNote}</p>
                      </div>

                      <div className="mt-auto flex justify-end gap-1.5 border-t border-stone-100 pt-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEdit(batch)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Sửa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setBatches((prev) =>
                              prev.filter((x) => x.id !== batch.id),
                            )
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "orders" && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs text-stone-600">
              <tr>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Lô</th>
                <th className="px-4 py-3">Số lượng</th>
                <th className="px-4 py-3">Thành tiền</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {ORDERS_MOCK.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-medium">{o.id}</td>
                  <td className="px-4 py-3">{o.buyer}</td>
                  <td className="px-4 py-3">{o.batch}</td>
                  <td className="px-4 py-3">{o.qty} tín chỉ</td>
                  <td className="px-4 py-3 font-semibold">
                    {o.total.toLocaleString("vi-VN")} đ
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-emerald-800">
                    {o.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "sellers" && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs text-stone-600">
              <tr>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Bên bán</th>
                <th className="px-4 py-3">Loại dự án</th>
                <th className="px-4 py-3">Sản lượng</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {SELLERS_MOCK.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium">{s.id}</td>
                  <td className="px-4 py-3">{s.org}</td>
                  <td className="px-4 py-3">{s.type}</td>
                  <td className="px-4 py-3">{s.volume}</td>
                  <td className="px-4 py-3 text-xs font-medium text-amber-800">
                    {s.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Container>
  );
}
