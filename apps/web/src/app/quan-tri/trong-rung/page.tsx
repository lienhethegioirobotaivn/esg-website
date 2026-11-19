"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, MapPin, Trees, X } from "lucide-react";
import {
  Button,
  Card,
  Container,
  Field,
  Input,
  Select,
  Switch,
} from "@/components/ui";

interface ForestryItem {
  id: string;
  code: string;
  title: string;
  location: string;
  projectType: string;
  imageUrl: string;
  pricingType: "fixed" | "quote";
  pricePerHa?: number;
  treeDensity?: string;
  careDuration?: string;
  expectedPlantingDate?: string;
  highlights: string[];
  published: boolean;
}

const INITIAL_FORESTRY: ForestryItem[] = [
  {
    id: "1",
    code: "LD-01",
    title: "Phục hồi rừng bản địa",
    location: "Lâm Đồng",
    projectType: "Trồng & phục hồi rừng",
    imageUrl:
      "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=800&q=80",
    pricingType: "fixed",
    pricePerHa: 100000000,
    treeDensity: "Dự kiến 1.000 cây / ha",
    careDuration: "Chăm sóc 3 năm",
    expectedPlantingDate: "06/2027",
    highlights: [
      "Dự kiến 1.000 cây / ha",
      "Chăm sóc 3 năm",
      "Trồng dự kiến 06/2027",
    ],
    published: true,
  },
  {
    id: "2",
    code: "GL-02",
    title: "Trồng rừng cùng cộng đồng",
    location: "Gia Lai",
    projectType: "Cây bản địa",
    imageUrl:
      "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80",
    pricingType: "quote",
    highlights: ["Cây bản địa", "Theo dõi định kỳ", "Phương án theo địa điểm"],
    published: true,
  },
  {
    id: "3",
    code: "CM-03",
    title: "Phục hồi rừng ngập mặn",
    location: "Cà Mau",
    projectType: "Phục hồi hệ sinh thái",
    imageUrl:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
    pricingType: "quote",
    highlights: [
      "Phục hồi hệ sinh thái",
      "Theo dõi định kỳ",
      "Phương án theo địa điểm",
    ],
    published: true,
  },
];

const SPONSOR_REQUESTS = [
  {
    id: "YC-01",
    company: "Công ty CP Thực phẩm Xanh",
    contact: "Nguyễn Minh Tuấn · 0909 123 456",
    location: "Lâm Đồng (LD-01)",
    budget: "5 ha (~500.000.000 đ)",
    status: "Chờ phản hồi",
  },
  {
    id: "YC-02",
    company: "Tập đoàn Dệt may Phương Nam",
    contact: "Lê Thị Hồng · hong.le@phuongnam.vn",
    location: "Cà Mau",
    budget: "Đề xuất theo địa điểm",
    status: "Đã gửi báo giá",
  },
];

const PROJECT_TYPE_OPTIONS = [
  { value: "Trồng & phục hồi rừng", label: "Trồng & phục hồi rừng" },
  { value: "Cây bản địa", label: "Cây bản địa" },
  { value: "Phục hồi hệ sinh thái", label: "Phục hồi hệ sinh thái" },
];

const PRICING_TYPE_OPTIONS = [
  { value: "fixed", label: "Gói cố định (đ/ha)" },
  { value: "quote", label: "Nhận báo giá" },
];

export default function ForestryAdminPage() {
  const [tab, setTab] = useState<"projects" | "requests">("projects");
  const [items, setItems] = useState<ForestryItem[]>(INITIAL_FORESTRY);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("Lâm Đồng");
  const [projectType, setProjectType] = useState("Trồng & phục hồi rừng");
  const [imageUrl, setImageUrl] = useState(
    "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=800&q=80",
  );
  const [pricingType, setPricingType] = useState<"fixed" | "quote">("fixed");
  const [pricePerHa, setPricePerHa] = useState(100000000);
  const [treeDensity, setTreeDensity] = useState("Dự kiến 1.000 cây / ha");
  const [careDuration, setCareDuration] = useState("Chăm sóc 3 năm");
  const [expectedPlantingDate, setExpectedPlantingDate] = useState("06/2027");
  const [published, setPublished] = useState(true);

  const locationOptions = [
    { value: "all", label: "Địa phương: Tất cả" },
    ...Array.from(new Set(items.map((x) => x.location))).map((loc) => ({
      value: loc,
      label: loc,
    })),
  ];

  const filtered = items.filter((x) => {
    const matchLoc = locationFilter === "all" || x.location === locationFilter;
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      x.title.toLowerCase().includes(q) ||
      x.location.toLowerCase().includes(q) ||
      x.code.toLowerCase().includes(q);
    return matchLoc && matchQ;
  });

  const openCreate = () => {
    setTab("projects");
    setEditingId(null);
    setCode("");
    setTitle("");
    setLocation("Lâm Đồng");
    setProjectType("Trồng & phục hồi rừng");
    setImageUrl(
      "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=800&q=80",
    );
    setPricingType("fixed");
    setPricePerHa(100000000);
    setTreeDensity("Dự kiến 1.000 cây / ha");
    setCareDuration("Chăm sóc 3 năm");
    setExpectedPlantingDate("06/2027");
    setPublished(true);
    setEditorOpen(true);
  };

  const openEdit = (item: ForestryItem) => {
    setTab("projects");
    setEditingId(item.id);
    setCode(item.code);
    setTitle(item.title);
    setLocation(item.location);
    setProjectType(item.projectType);
    setImageUrl(item.imageUrl);
    setPricingType(item.pricingType);
    setPricePerHa(item.pricePerHa ?? 100000000);
    setTreeDensity(item.treeDensity ?? "");
    setCareDuration(item.careDuration ?? "");
    setExpectedPlantingDate(item.expectedPlantingDate ?? "");
    setPublished(item.published);
    setEditorOpen(true);
  };

  const handleSave = () => {
    const highlights =
      pricingType === "fixed"
        ? [
            treeDensity || "Dự kiến 1.000 cây / ha",
            careDuration || "Chăm sóc 3 năm",
            expectedPlantingDate
              ? `Trồng dự kiến ${expectedPlantingDate}`
              : "Theo dõi định kỳ",
          ]
        : [projectType, "Theo dõi định kỳ", "Phương án theo địa điểm"];

    if (editingId) {
      setItems((prev) =>
        prev.map((x) =>
          x.id === editingId
            ? {
                ...x,
                code: code || x.code,
                title: title || "Dự án trồng rừng",
                location,
                projectType,
                imageUrl,
                pricingType,
                pricePerHa: pricingType === "fixed" ? pricePerHa : undefined,
                treeDensity,
                careDuration,
                expectedPlantingDate,
                highlights,
                published,
              }
            : x,
        ),
      );
    } else {
      setItems((prev) => [
        {
          id: String(Date.now()),
          code: code || `PRJ-0${prev.length + 1}`,
          title: title || "Dự án trồng rừng mới",
          location,
          projectType,
          imageUrl,
          pricingType,
          pricePerHa: pricingType === "fixed" ? pricePerHa : undefined,
          treeDensity,
          careDuration,
          expectedPlantingDate,
          highlights,
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
            <Button size="sm">Trồng rừng</Button>
          </Link>
          <Link href="/quan-tri/tin-chi-carbon">
            <Button variant="secondary" size="sm">
              Tín chỉ Carbon
            </Button>
          </Link>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm dự án trồng rừng
        </Button>
      </div>

      <div>
        <p className="text-xs text-stone-500">Giải pháp carbon / Trồng rừng</p>
        <h1 className="font-sans text-2xl font-semibold text-stone-900">
          Quản lý dự án trồng rừng
        </h1>
      </div>

      <div className="flex gap-6 border-b border-stone-200 text-sm font-medium">
        <button
          type="button"
          onClick={() => setTab("projects")}
          className={`border-b-2 pb-2.5 ${
            tab === "projects"
              ? "border-[#0f3d2e] text-[#0f3d2e]"
              : "border-transparent text-stone-500"
          }`}
        >
          Danh sách dự án ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("requests")}
          className={`border-b-2 pb-2.5 ${
            tab === "requests"
              ? "border-[#0f3d2e] text-[#0f3d2e]"
              : "border-transparent text-stone-500"
          }`}
        >
          Hồ sơ tài trợ & Báo giá ({SPONSOR_REQUESTS.length})
        </button>
      </div>

      {tab === "projects" ? (
        <>
          {editorOpen && (
            <Card className="space-y-4 border-stone-300 bg-stone-50/60 p-5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h2 className="font-sans text-lg font-semibold text-stone-900">
                  {editingId
                    ? "Chỉnh sửa dự án trồng rừng"
                    : "Tạo dự án trồng rừng"}
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
                <Field label="Mã dự án" htmlFor="forestry-code">
                  <Input
                    id="forestry-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="LD-01"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Tên dự án" htmlFor="forestry-title">
                    <Input
                      id="forestry-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Phục hồi rừng bản địa"
                    />
                  </Field>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Địa phương" htmlFor="forestry-location">
                  <Input
                    id="forestry-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </Field>
                <Field label="Loại dự án" htmlFor="forestry-type">
                  <Select
                    id="forestry-type"
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    options={PROJECT_TYPE_OPTIONS}
                    placeholder="Chọn loại dự án"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Hình thức chi phí" htmlFor="forestry-pricing">
                  <Select
                    id="forestry-pricing"
                    value={pricingType}
                    onChange={(e) =>
                      setPricingType(e.target.value as "fixed" | "quote")
                    }
                    options={PRICING_TYPE_OPTIONS}
                    placeholder="Chọn hình thức chi phí"
                  />
                </Field>
                {pricingType === "fixed" && (
                  <Field label="Chi phí (VNĐ / ha)" htmlFor="forestry-price">
                    <Input
                      id="forestry-price"
                      type="number"
                      value={pricePerHa}
                      onChange={(e) => setPricePerHa(Number(e.target.value))}
                    />
                  </Field>
                )}
              </div>

              {pricingType === "fixed" && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Mật độ cây" htmlFor="forestry-density">
                    <Input
                      id="forestry-density"
                      value={treeDensity}
                      onChange={(e) => setTreeDensity(e.target.value)}
                    />
                  </Field>
                  <Field label="Chăm sóc" htmlFor="forestry-care">
                    <Input
                      id="forestry-care"
                      value={careDuration}
                      onChange={(e) => setCareDuration(e.target.value)}
                    />
                  </Field>
                  <Field label="Trồng dự kiến" htmlFor="forestry-planting">
                    <Input
                      id="forestry-planting"
                      value={expectedPlantingDate}
                      onChange={(e) => setExpectedPlantingDate(e.target.value)}
                    />
                  </Field>
                </div>
              )}

              <Field label="URL ảnh" htmlFor="forestry-image">
                <Input
                  id="forestry-image"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </Field>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <Switch
                  id="forestry-published-editor"
                  checked={published}
                  onChange={setPublished}
                  label="Hiển thị dự án"
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setEditorOpen(false)}
                  >
                    Hủy
                  </Button>
                  <Button onClick={handleSave}>Lưu dự án</Button>
                </div>
              </div>
            </Card>
          )}

          <Card className="flex flex-wrap gap-3 p-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên dự án, địa phương hoặc mã..."
              className="min-w-[240px] flex-1"
            />
            <Select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              options={locationOptions}
              placeholder="Địa phương"
              className="w-48"
            />
          </Card>

          <div className="grid gap-5 md:grid-cols-3">
            {filtered.map((item) => (
              <Card key={item.id} className="flex flex-col overflow-hidden">
                <div className="relative h-44 bg-stone-100">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-2 right-2 rounded bg-white/95 px-2 py-1">
                    <Switch
                      id={`forestry-published-${item.id}`}
                      checked={item.published}
                      onChange={() =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === item.id
                              ? { ...x, published: !x.published }
                              : x,
                          ),
                        )
                      }
                      label={item.published ? "Hiện" : "Ẩn"}
                    />
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-1.5 text-xs text-stone-600">
                    <MapPin className="h-3.5 w-3.5 text-[#0f3d2e]" />
                    <span>{item.location}</span>
                  </div>

                  <h2 className="mt-1 font-sans text-lg font-semibold text-stone-900">
                    {item.title}
                  </h2>
                  <p className="text-xs text-stone-400">{item.code}</p>

                  <ul className="mt-3 space-y-1.5 text-xs text-stone-600">
                    {item.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2">
                        <Trees className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto border-t border-stone-100 pt-3">
                    {item.pricingType === "fixed" && item.pricePerHa ? (
                      <div>
                        <p className="text-[11px] text-stone-500">Chi phí</p>
                        <p className="text-base font-bold text-stone-900">
                          {item.pricePerHa.toLocaleString("vi-VN")} đ / ha
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-[#0f3d2e]">
                        Nhận báo giá
                      </p>
                    )}

                    <div className="mt-3 flex justify-end gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setItems((prev) =>
                            prev.filter((x) => x.id !== item.id),
                          )
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs text-stone-600">
              <tr>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Doanh nghiệp</th>
                <th className="px-4 py-3">Địa điểm</th>
                <th className="px-4 py-3">Quy mô / Ngân sách</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {SPONSOR_REQUESTS.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.company}</p>
                    <p className="text-xs text-stone-500">{r.contact}</p>
                  </td>
                  <td className="px-4 py-3">{r.location}</td>
                  <td className="px-4 py-3">{r.budget}</td>
                  <td className="px-4 py-3 text-xs font-medium text-emerald-800">
                    {r.status}
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
