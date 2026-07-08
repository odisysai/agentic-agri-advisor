from data import firestore_manager


class FakeDocument:
    def __init__(self, path, writes):
        self.path = path
        self.writes = writes

    def collection(self, name):
        return FakeCollection(f"{self.path}/{name}", self.writes)

    def set(self, data):
        self.writes[self.path] = data


class FakeCollection:
    def __init__(self, path, writes):
        self.path = path
        self.writes = writes

    def document(self, doc_id):
        return FakeDocument(f"{self.path}/{doc_id}", self.writes)


class FakeFirestore:
    def __init__(self):
        self.writes = {}

    def collection(self, name):
        return FakeCollection(name, self.writes)


def test_save_content_item_writes_farmer_and_top_level_records(monkeypatch) -> None:
    fake_db = FakeFirestore()
    monkeypatch.setattr(firestore_manager, "_get_firestore", lambda: fake_db)

    result = firestore_manager.save_content_item(
        {
            "content_id": "content_unit_test",
            "farmer_id": "farmer_unit",
            "category": "crop_photos",
            "file_name": "leaf.jpg",
            "storage_bucket": "bucket",
            "storage_object": "users/farmer_unit/crop_photos/2026/07/leaf.jpg",
            "storage_uri": "gs://bucket/users/farmer_unit/crop_photos/2026/07/leaf.jpg",
            "content_type": "image/jpeg",
            "file_size_bytes": 123,
            "source": "unit_test",
            "status": "uploaded",
        }
    )

    assert result["status"] == "success"
    assert "farmers/farmer_unit/content_items/content_unit_test" in fake_db.writes
    assert "content_items/content_unit_test" in fake_db.writes
    assert (
        fake_db.writes["farmers/farmer_unit/content_items/content_unit_test"][
            "storage_uri"
        ]
        == "gs://bucket/users/farmer_unit/crop_photos/2026/07/leaf.jpg"
    )
