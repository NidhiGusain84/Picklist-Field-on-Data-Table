import { LightningElement, api, wire } from 'lwc';
import getContactsBasedOnAccount from '@salesforce/apex/ContactController.getContactsBasedOnAccount';
import { deleteRecord, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import CONTACT_OBJECT from '@salesforce/schema/Contact';
import LEAD_SOURCE_FIELD from '@salesforce/schema/Contact.LeadSource';

const ACTIONS = [
    { label: 'View', name: 'view' },
    { label: 'Edit', name: 'edit' },
    { label: 'Delete', name: 'delete' }
];

const COLUMNS = [
    { label: 'First Name', fieldName: 'FirstName', editable: true },
    { label: 'Last Name', fieldName: 'LastName', editable: true },
    { label: 'Title', fieldName: 'Title', editable: true },
    { label: 'Phone', fieldName: 'Phone', type: 'phone' },
    { label: 'Email', fieldName: 'Email', type: 'email' },
    {
        label: 'Lead Source', fieldName: 'LeadSource', type: 'customPicklist', editable: true, typeAttributes: {
            options: { fieldName: 'picklistOptions' },
            value: { fieldName: 'LeadSource' },
            context: { fieldName: 'Id' }
        }
    },
    { type: 'action', typeAttributes: { rowActions: ACTIONS } }
];

export default class EditDataTableRows extends LightningElement {
    @api recordId;
    contactData = [];
    columns = COLUMNS;
    draftValues = [];
    contactRefreshProp;
    leadSourceOptions = [];
    viewMode = false;
    editMode = false;
    showModal = false;
    selectedRecordId;

    @wire(getContactsBasedOnAccount, {
        accountId: "$recordId",
        pickList: "$leadSourceOptions"
    })
    getContactsOutput(result) {
        this.contactRefreshProp = result;
        if (result.data) {
            this.contactData = result.data.map(currentItem => {
                let picklistOptions = this.leadSourceOptions;
                return {
                    ...currentItem,
                    picklistOptions: picklistOptions
                };
            });

        } else if (result.error) {
            console.log("Error while loading records.");
        }
    }

    @wire(getObjectInfo, {
        objectApiName: CONTACT_OBJECT
    }) objectInfo;

    @wire(getPicklistValues, {
        recordTypeId: "$objectInfo.data.defaultRecordTypeId",
        fieldApiName: LEAD_SOURCE_FIELD
    }) wiredPicklist({ data, error }) {
        if (data) {
            this.leadSourceOptions = data.values;
        } else if (error) {
            console.log("Error while loading data", error);
        }
    }

    async saveHandler(event) {
        let records = event.detail.draftValues;
        let updatedRecordsArray = records.map(currentItem => {
            let fieldInput = { ...currentItem };
            return {
                fields: fieldInput
            }
        });

        this.draftValues = [];
        let updateRecordsArrayPromise = updatedRecordsArray.map((currentItem) =>
            updateRecord(currentItem)
        );

        await Promise.all(updateRecordsArrayPromise);
        const toastEvent = new ShowToastEvent({
            title: 'Success',
            variant: 'success',
            message: 'Record updated successfully.',
        });
        this.dispatchEvent(toastEvent);
        await refreshApex(this.contactRefreshProp);
    }

    rowActionHandler(event) {
        let action = event.detail.action;
        let selectedRow = event.detail.row;
        this.selectedRecordId = selectedRow.Id;
        this.viewMode = false;
        this.editMode = false;
        this.showModal = false;

        if (action.name === 'view') {
            this.viewMode = true;
            this.showModal = true;
        }
        else if (action.name === 'edit') {
            this.editMode = true;
            this.showModal = true;
        }
        else if (action.name === 'delete') {
            this.deleteHandler();
        }
    }

    async deleteHandler() {
        try {
            await deleteRecord(this.selectedRecordId);

            const toastEvent = new ShowToastEvent({
                title: 'Success',
                variant: 'success',
                message: 'Record deleted successfully.',
            });
            this.dispatchEvent(toastEvent);

            await refreshApex(this.contactRefreshProp);
        } catch (error) {
            const toastEvent = new ShowToastEvent({
                title: 'Error',
                variant: 'error',
                message: error.body.message,
            });
            this.dispatchEvent(toastEvent);
        }

    }


    async closeModal() {
        this.showModal = false;
        if (this.editMode) {
            await refreshApex(this.contactRefreshProp);
        }
    }


}